import 'dotenv/config';
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresDatabase } from '@fracture/paypal-core';
import { TandemStore, type TandemAction } from '../packages/tandem/src/store';
import { invokeLocalTandem } from '../packages/tandem/src/local';
import { TandemBridge, strictFrame } from '../packages/tandem/src/bridge';
import { tandemSource } from '../packages/tandem/src/source';

async function setup(t:TestContext,faults:string[]=[]){
  assert.ok(process.env.DATABASE_URL,'Tandem durability qualification requires PostgreSQL');
  const admin=new PostgresDatabase(process.env.DATABASE_URL);const schema=`tandem_test_${randomUUID().replaceAll('-','')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);
  const db=new PostgresDatabase(url.toString()),store=new TandemStore(db,randomUUID(),randomUUID());await store.initialize();
  await store.create({intent:'one-evening-ticket',minor:4800,expiresAt:new Date(Date.now()+3600000).toISOString(),sourceHash:(await tandemSource()).sourceHash,faults});
  t.after(async()=>{await db.close();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.close();});return {store,url:url.toString()};
}
const checkout=(store:TandemStore,revision:'faulty'|'hardened'='hardened')=>invokeLocalTandem(store,{revision,action:'checkout'});
const result=(value:Record<string,unknown>)=>value.result as Record<string,unknown>;
const write=(store:TandemStore,kind:'capture_authorization'|'refund'|'void',key:string,resourceId:string,minor:number)=>invokeLocalTandem(store,{revision:'hardened',action:'operation',parameters:{kind,key,resourceId,minor}});

test('Python SDK happy paths produce one completed capture and one ticket in both revisions',async t=>{
  for(const revision of ['faulty','hardened'] as const){await t.test(revision,async t=>{const {store}=await setup(t);assert.equal(result(await checkout(store,revision)).status,'paid');const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='capture'&&r.status==='COMPLETED').length,1);assert.equal(view.entitlements.length,1);const requests=view.events.filter(e=>e.kind==='provider.request').map(e=>e.document as {headers:Record<string,string>;method:string});assert.ok(requests.filter(r=>r.method==='POST').every(r=>revision==='hardened'?!!r.headers['paypal-request-id']:!r.headers['paypal-request-id']));});}
});
test('lost capture answer creates a true duplicate in baseline; hardened target reads the original order',async t=>{
  for(const revision of ['faulty','hardened'] as const){await t.test(revision,async t=>{const {store}=await setup(t,['drop_capture_once']);const first=await checkout(store,revision);assert.equal(result(first).status,revision==='faulty'?'failed':'paid');await checkout(store,revision);const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='capture').length,revision==='faulty'?2:1);assert.equal(view.resources.filter(r=>r.kind==='order').length,revision==='faulty'?2:1);assert.equal(view.events.filter(e=>e.kind==='provider.resource_read').length,revision==='faulty'?0:1);assert.equal(view.entitlements.length,1);});}
});
test('unavailable original read stays checking without fulfillment or a second charge',async t=>{const {store}=await setup(t,['drop_capture_once','unavailable_read']);await checkout(store);await checkout(store);const view=await store.snapshot();assert.equal(view.run.ticket.status,'checking');assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.entitlements.length,0);assert.equal(view.operations.find(o=>o.action.kind==='capture_order')?.status,'unknown');});
test('pending payment is never a paid ticket in hardened target; baseline defect remains observable',async t=>{for(const revision of ['faulty','hardened'] as const){await t.test(revision,async t=>{const {store}=await setup(t,['capture_pending']);await checkout(store,revision);const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='capture')[0]?.status,'PENDING');assert.equal(view.entitlements.length,revision==='faulty'?1:0);assert.equal(view.run.ticket.status,revision==='faulty'?'paid':'checking');});}});
test('known never-sent failure produces no financial read or provider resource',async t=>{const {store}=await setup(t,['auth_not_sent']);await checkout(store);const view=await store.snapshot();assert.equal(view.run.ticket.status,'failed');assert.equal(view.resources.length,0);assert.equal(view.events.filter(e=>e.kind==='provider.resource_read').length,0);assert.equal(view.operations[0]?.status,'not_sent');});
test('lost create response retains the original unknown operation and never invents an order lookup',async t=>{const {store}=await setup(t,['drop_create_once']);await checkout(store);await checkout(store);const view=await store.snapshot();assert.equal(view.run.ticket.status,'checking');assert.equal(view.resources.filter(r=>r.kind==='order').length,1);assert.equal(view.resources.filter(r=>r.kind==='capture').length,0);assert.equal(view.operations[0]?.resourceId,null);assert.equal(view.operations[0]?.status,'unknown');assert.equal(view.events.filter(e=>e.kind==='provider.resource_read').length,0);});
test('malformed successful capture response reconciles actual preserved resource',async t=>{const {store}=await setup(t,['malformed_capture_once']);await checkout(store);const view=await store.snapshot();assert.equal(view.run.ticket.status,'paid');assert.equal(view.entitlements.length,1);assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.events.filter(e=>e.kind==='fault.response_malformed').length,1);assert.equal(view.events.filter(e=>e.kind==='provider.resource_read').length,1);});
test('six simultaneous Python workers share a durable claim and one ticket',async t=>{const {store}=await setup(t);await Promise.all(Array.from({length:6},()=>checkout(store)));await checkout(store);const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='order').length,1);assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.entitlements.length,1);assert.equal(view.run.ticket.status,'paid');assert.equal(view.operations.length,2);});
test('partial capture and remaining-hold release preserve captured money and do not pretend to refund',async t=>{
  const {store}=await setup(t);await invokeLocalTandem(store,{revision:'hardened',action:'reserve'});let view=await store.snapshot();const authorization=view.resources.find(r=>r.kind==='authorization')!;
  assert.equal(view.run.ticket.status,'reserved');assert.equal(view.entitlements.length,0);
  assert.equal(result(await write(store,'capture_authorization','admission-deposit',authorization.id,3000)).status,'succeeded');
  assert.equal(result(await write(store,'void','unused-hold',authorization.id,0)).status,'succeeded');
  view=await store.snapshot();assert.equal(view.resources.find(r=>r.id===authorization.id)?.status,'VOIDED');assert.equal(view.resources.filter(r=>r.kind==='capture').reduce((n,r)=>n+r.minor,0),3000);assert.equal(view.resources.filter(r=>r.kind==='refund').length,0);
  assert.ok(view.events.some(e=>e.kind==='provider.resource_read'&&(e.document as {kind:string}).kind==='authorization'));
});
test('parallel refunds atomically reserve remainder and same-operation replay does not send another refund',async t=>{
  const {store}=await setup(t);await checkout(store);const capture=(await store.resources()).find(r=>r.kind==='capture')!;
  const answers=await Promise.all([write(store,'refund','refund-one',capture.id,3000),write(store,'refund','refund-two',capture.id,3000)]);
  assert.equal(answers.filter(r=>result(r).status==='succeeded').length,1);const winner=(await store.operations()).find(o=>o.action.kind==='refund')!;await write(store,'refund',winner.key,capture.id,3000);
  const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='refund').length,1);assert.equal(view.resources.filter(r=>r.kind==='refund')[0]?.minor,3000);assert.equal(view.resources.find(r=>r.id===capture.id)?.minor,4800);
});
test('lost partial-capture answer has no exact capture id and cannot be inferred from the authorization balance',async t=>{
  const {store}=await setup(t,['drop_capture_once']);await invokeLocalTandem(store,{revision:'hardened',action:'reserve'});const authorization=(await store.resources()).find(r=>r.kind==='authorization')!;
  await write(store,'capture_authorization','first-part',authorization.id,3000);await write(store,'capture_authorization','first-part',authorization.id,3000);const view=await store.snapshot();
  assert.equal(view.operations.find(o=>o.key==='first-part')?.status,'unknown');assert.equal(view.operations.find(o=>o.key==='first-part')?.resourceId,null);assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.events.filter(e=>e.kind==='provider.resource_read').length,0);
});
test('lost refund response holds its exact reservation; changed payload and larger refunds are rejected',async t=>{
  const {store}=await setup(t,['drop_refund_once']);await checkout(store);const capture=(await store.resources()).find(r=>r.kind==='capture')!;
  await write(store,'refund','original-refund',capture.id,3000);await write(store,'refund','original-refund',capture.id,3000);assert.equal(result(await write(store,'refund','original-refund',capture.id,3100)).status,'refused');assert.equal(result(await write(store,'refund','other-refund',capture.id,2000)).status,'refused');
  const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='refund').length,1);assert.equal(view.operations.find(o=>o.key==='original-refund')?.status,'unknown');assert.equal(view.operations.find(o=>o.key==='original-refund')?.resourceId,null);
});
test('database/process restart retains original captures and operation claims',async t=>{const {store,url}=await setup(t,['drop_capture_once','unavailable_read']);await checkout(store);const secondDb=new PostgresDatabase(url);try{const resumed=new TandemStore(secondDb,store.sessionId,store.runId);await checkout(resumed);const view=await resumed.snapshot();assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.run.ticket.status,'checking');assert.equal(view.operations.length,2);}finally{await secondDb.close();}});
test('worker crash after committed capture frame is recovered from the original order on a fresh invocation',async t=>{
  const {store}=await setup(t);
  // create: authority,claim,authority,dispatch,provider,record (6 frames);
  // capture repeats the first five; kill before returning frame11 to Python.
  await assert.rejects(invokeLocalTandem(store,{revision:'hardened',action:'checkout'},{killAfterFrame:11}),/CONTROLLED_WORKER_CRASH/);
  const before=await store.snapshot();assert.equal(before.resources.filter(r=>r.kind==='capture').length,1);assert.equal(before.entitlements.length,0);
  await checkout(store);const after=await store.snapshot();assert.equal(after.resources.filter(r=>r.kind==='capture').length,1);assert.equal(after.entitlements.length,1);assert.equal(after.run.ticket.status,'paid');
});
test('revocation between claim and dispatch blocks the original write; another tenant cannot read the run',async t=>{
  const {store}=await setup(t);const action:TandemAction={kind:'create',intent:'one-evening-ticket',minor:4800,resourceId:null,authorize:false,finalCapture:false,currency:'USD'};
  await store.claim('purchase:create',action,1,'worker');await store.revoke();await assert.rejects(store.record('purchase:create','dispatching','worker'),/AUTHORITY_CHANGED/);
  assert.equal((await store.resources()).length,0);await assert.rejects(new TandemStore(store.db,randomUUID(),store.runId).run(),/RUN_NOT_OWNED/);
});
test('bridge rejects duplicate, crossed and expired frames without forwarding any request',async t=>{
  const {store}=await setup(t);const id=randomUUID(),bridge=new TandemBridge(store,id,Date.now()+10000);await bridge.initialize();
  const frame={version:1,type:'request',invocationId:id,sequence:1,requestId:`${id}:1`,channel:'authority.read',payload:{}};
  await bridge.handle(JSON.stringify(frame)+'\n');await assert.rejects(bridge.handle(JSON.stringify(frame)+'\n'),/CORRELATION/);
  const crossed=new TandemBridge(store,randomUUID(),Date.now()+10000);await assert.rejects(crossed.handle(JSON.stringify(frame)+'\n'),/CORRELATION/);
  const expired=new TandemBridge(store,id,Date.now()-1);await assert.rejects(expired.handle(JSON.stringify(frame)+'\n'),/CHANNEL_CLOSED/);assert.equal((await store.resources()).length,0);
});
test('strict frame parser rejects duplicate nested keys and excessive nesting',()=>{
  assert.throws(()=>strictFrame('{"a":1,"a":2}\n'),/DUPLICATE_FRAME_KEY/);
  assert.throws(()=>strictFrame('{"a":[{"x":1,"x":2}]}\n'),/DUPLICATE_FRAME_KEY/);
  assert.deepEqual(strictFrame(JSON.stringify({a:[{x:1},{x:2}],b:'comma, quote "'})+'\n'),{a:[{x:1},{x:2}],b:'comma, quote "'});
  assert.throws(()=>strictFrame('['.repeat(65)+'0'+']'.repeat(65)+'\n'),/NESTING/);
});
test('cancelled target can reconcile the original uncertain capture using reads only',async t=>{
  const {store}=await setup(t);await assert.rejects(invokeLocalTandem(store,{revision:'hardened',action:'checkout'},{killAfterFrame:11}),/CONTROLLED_WORKER_CRASH/);await store.revoke();
  const value=await invokeLocalTandem(store,{revision:'hardened',action:'reconcile',parameters:{key:'purchase:capture_order'}});assert.equal(result(value).status,'succeeded');const view=await store.snapshot();assert.equal(view.resources.filter(r=>r.kind==='capture').length,1);assert.equal(view.entitlements.length,0);
});
