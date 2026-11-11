import 'dotenv/config';
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresDatabase } from '@fracture/paypal-core';
import { TandemExperiments } from '../packages/tandem/src/experiments';
import type { TandemRunner } from '../packages/tandem/src/jobs';
import { processTandemJob } from '../packages/tandem/src/jobs';
import { invokeLocalTandem } from '../packages/tandem/src/local';
import { TandemBridge } from '../packages/tandem/src/bridge';

const local:TandemRunner=(store,input)=>invokeLocalTandem(store,input);

async function setup(t:TestContext){
  assert.ok(process.env.DATABASE_URL);const admin=new PostgresDatabase(process.env.DATABASE_URL),schema=`tandem_jobs_${randomUUID().replaceAll('-','')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);const db=new PostgresDatabase(url.toString()),service=new TandemExperiments(db);await service.initialize();
  t.after(async()=>{await db.close();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.close();});
  const session=randomUUID(),expiry=new Date(Date.now()+3600000).toISOString();return {db,service,session,expiry,url:url.toString()};
}
test('one atomic comparison survives duplicate starts, uses fresh paired resources, and rejects another session',async t=>{
  const {service,session,expiry}=await setup(t),requestId=randomUUID();const answers=await Promise.all(Array.from({length:5},()=>service.create(session,'lost-answer',requestId,expiry)));
  assert.equal(answers.filter(x=>x.created).length,1);assert.equal(new Set(answers.map(x=>x.experiment.id)).size,1);const first=answers[0]!;assert.equal(first.jobs.length,2);assert.notEqual(first.experiment.runs.faulty,first.experiment.runs.hardened);
  await assert.rejects(service.create(session,'pending',requestId,expiry),/different scenario/);await assert.rejects(service.detail(randomUUID(),first.experiment.id),/not in your session/);
  await assert.rejects(service.create(session,'clean',randomUUID(),expiry),/current comparison/);
});
test('workflow retries never replay a completed faulty invocation; explicit customer retry demonstrates the duplicate',async t=>{
  const {service,session,expiry}=await setup(t),first=await service.create(session,'lost-answer',randomUUID(),expiry);
  for(const job of first.jobs)await processTandemJob(service,job.id,local);
  let view=await service.detail(session,first.experiment.id);assert.equal(view.runs.faulty?.run.ticket.status,'failed');assert.equal(view.runs.hardened?.run.ticket.status,'paid');
  const faulty=first.jobs.find(j=>j.revision==='faulty')!;let reentered=0;await processTandemJob(service,faulty.id,async()=>{reentered++;return {};});assert.equal(reentered,0);
  const next=await service.command(session,first.experiment.id,{requestId:randomUUID(),revision:'faulty',action:'retry'});await processTandemJob(service,next.id,local);
  view=await service.detail(session,first.experiment.id);assert.equal(view.runs.faulty?.resources.filter(r=>r.kind==='capture').length,2);assert.equal(view.runs.hardened?.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.runs.faulty?.entitlements.length,1);assert.equal(view.runs.hardened?.entitlements.length,1);
});
test('lease expiration fences every frame and retains uncertain work without redispatch',async t=>{
  const {service,session,expiry,db}=await setup(t),first=await service.create(session,'clean',randomUUID(),expiry),claimed=await service.claim(first.jobs[0]!.id);assert.ok(claimed);
  const bridge=new TandemBridge(service.fencedStore(claimed),randomUUID(),Date.now()+30000);await bridge.initialize();
  await db.query("UPDATE tandem_jobs SET lease_until=now()-interval '1 second',document=jsonb_set(document,'{leaseUntil}',to_jsonb((now()-interval '1 second')::text)) WHERE id=$1",[claimed.id]);
  const frame={version:1,type:'request',invocationId:bridge.invocationId,sequence:1,requestId:`${bridge.invocationId}:1`,channel:'authority.read',payload:{}};
  await assert.rejects(bridge.handle(JSON.stringify(frame)+'\n'),/FENCE_CLOSED/);assert.equal(await service.recoverExpired(),1);assert.equal((await service.job(claimed.id))?.stage,'uncertain');assert.equal(await service.claim(claimed.id),null);assert.equal(await service.finish(claimed,{late:true}),false);
  assert.equal((await db.query('SELECT * FROM tandem_frames')).rowCount,0);
});
test('global and session limits admit at most three isolated workers and one per session',async t=>{
  const {service,expiry}=await setup(t),batches=[];for(let i=0;i<4;i++)batches.push(await service.create(randomUUID(),'clean',randomUUID(),expiry));
  const claims=await Promise.all(batches.flatMap(b=>b.jobs.map(j=>service.claim(j.id))));const accepted=claims.filter(j=>j!==null);assert.equal(accepted.length,3);assert.equal(new Set(accepted.map(j=>j.sessionId)).size,3);
});
test('cancellation closes active frames, preserves committed effects, and allows only original reconciliation',async t=>{
  const {service,session,expiry}=await setup(t),first=await service.create(session,'clean',randomUUID(),expiry),faulty=first.jobs.find(j=>j.revision==='faulty')!,hardened=first.jobs.find(j=>j.revision==='hardened')!;
  await processTandemJob(service,faulty.id,local);
  await processTandemJob(service,hardened.id,(store,input)=>invokeLocalTandem(store,input,{killAfterFrame:11}));
  assert.equal((await service.job(hardened.id))?.stage,'uncertain');await service.cancel(session,first.experiment.id);
  await assert.rejects(service.command(session,first.experiment.id,{requestId:randomUUID(),revision:'hardened',action:'retry'}),/closed/);
  const read=await service.command(session,first.experiment.id,{requestId:randomUUID(),revision:'hardened',action:'reconcile',operationKey:'purchase:capture_order'});await processTandemJob(service,read.id,local);
  const view=await service.detail(session,first.experiment.id);assert.equal(view.runs.hardened?.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.runs.hardened?.entitlements.length,0);assert.equal(view.runs.hardened?.operations.find(o=>o.key==='purchase:capture_order')?.status,'succeeded');assert.equal(view.experiment.cancelled,true);
});
test('reservation uses original resources and repeated action identity cannot add another capture or refund',async t=>{
  const {service,session,expiry}=await setup(t),first=await service.create(session,'reservation',randomUUID(),expiry);assert.equal(first.jobs.length,1);await processTandemJob(service,first.jobs[0]!.id,local);
  for(const action of ['capture_deposit','release_remainder','refund_deposit'] as const){const job=await service.command(session,first.experiment.id,{requestId:randomUUID(),revision:'hardened',action});await processTandemJob(service,job.id,local);const repeat=await service.command(session,first.experiment.id,{requestId:randomUUID(),revision:'hardened',action});await processTandemJob(service,repeat.id,local);}
  const view=await service.detail(session,first.experiment.id),resources=view.runs.hardened!.resources;assert.equal(resources.filter(r=>r.kind==='capture').length,1);assert.equal(resources.filter(r=>r.kind==='refund').length,1);assert.equal(resources.find(r=>r.kind==='authorization')?.status,'VOIDED');assert.equal(resources.find(r=>r.kind==='capture')?.minor,3000);assert.equal(resources.find(r=>r.kind==='refund')?.minor,3000);
});
test('a second database instance resumes queued work without losing source binding or evidence',async t=>{
  const {service,session,expiry,url}=await setup(t),first=await service.create(session,'pending',randomUUID(),expiry),db2=new PostgresDatabase(url);try{const resumed=new TandemExperiments(db2);for(const job of first.jobs)await processTandemJob(resumed,job.id,local);const view=await service.detail(session,first.experiment.id);assert.equal(view.runs.faulty?.entitlements.length,1);assert.equal(view.runs.hardened?.entitlements.length,0);assert.equal(view.runs.hardened?.run.ticket.status,'checking');assert.equal(view.experiment.sourceHash,view.runs.hardened?.run.sourceHash);}finally{await db2.close();}
});
