import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PostgresDatabase,SqliteDatabase } from '@fracture/paypal-core';
import type { SqlDatabase } from '@fracture/paypal-core';
import { initializeDatabase } from '../packages/service/src/database';
import { LabService,LabStore } from '../packages/service/src/index';
import { newRun } from '../packages/service/src/executor';
import { projectCatalog } from '../packages/service/src/catalog';
import { scenarios } from '../packages/scenarios/src/index';
import { LocalPayPalTransport } from '../packages/runner/src/local-provider';
import { noFaults } from '../packages/service/src/types';
import { guardedErrandOrder } from '../apps/fixtures/errand/control';
import { callErrandToolkit,errandArguments } from '../apps/fixtures/errand/toolkit';

const adapters=(process.env.DATABASE_URL?['sqlite','postgres']:['sqlite']) as ('sqlite'|'postgres')[];
async function setup(t:TestContext,adapter:'sqlite'|'postgres'){
  let db:SqlDatabase;let cleanup=async()=>{};
  if(adapter==='postgres'){
    const admin=new PostgresDatabase(process.env.DATABASE_URL!);const schema=`errand_test_${randomUUID().replaceAll('-','')}`;await admin.query(`CREATE SCHEMA ${schema}`);
    const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('options',`-c search_path=${schema}`);db=new PostgresDatabase(url.toString());
    cleanup=async()=>{await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.close();};
  }else db=new SqliteDatabase(':memory:');
  await initializeDatabase(db);const store=new LabStore(db),service=new LabService(store),session=await store.createSession('owner');
  t.after(async()=>{await db.close();await cleanup();});return{db,store,service,session};
}
async function rawRun(f:Awaited<ReturnType<typeof setup>>){
  const project=(await projectCatalog([])).find(p=>p.id==='errand')!,scenario=scenarios.find(s=>s.id==='E0')!;
  const input={projectId:'errand',scenarioId:'E0',revision:'hardened' as const,mode:'sample' as const,seed:'errand-regression',requestId:randomUUID(),interactive:false};
  return (await f.store.createRun(f.session.id,input,newRun(input,scenario,project))).run;
}
for(const adapter of adapters){
  test(`${adapter}: actual Toolkit baseline creates two orders, control recovers one, neither captures`,async t=>{
    const f=await setup(t,adapter);
    for(const revision of ['faulty','hardened'] as const){
      const run=await f.service.startRun(f.session.id,{projectId:'errand',scenarioId:'E0',revision,mode:'sample',seed:'matched-errand-seed',requestId:randomUUID(),interactive:false});
      assert.equal(run.orderIds.length,revision==='faulty'?2:1);assert.equal(run.captureCount,0);assert.equal(run.fulfillmentCount,0);assert.equal(run.verdict,revision==='faulty'?'fail':'pass');
      assert.equal(run.events.filter(e=>e.kind==='errand_tool_result').length,2);assert.equal(run.events.find(e=>e.kind==='errand_tool_result')?.title,'The order answer is missing');
      const attempts=(await f.db.query<{document:string}&Record<string,unknown>>('SELECT document FROM lab_target_attempts WHERE run_id=$1',[run.id])).rows.map(x=>JSON.parse(x.document));
      assert.equal(attempts.length,2);assert.ok(attempts.every(a=>a.path==='/v2/checkout/orders'&&a.method==='POST'));assert.equal(new Set(attempts.map(a=>a.providerRequestId)).size,revision==='faulty'?2:1);
      const resources=await f.store.resources(run.id);assert.ok(resources.every(r=>r.kind==='order'&&!r.approved));
    }
    const view=(await f.service.workspace(f.session)).errand;assert.equal(view.unprotectedOrderIds.length,2);assert.equal(view.hardenedOrderIds.length,1);assert.equal(view.chargeCount,0);assert.equal(view.toolCalls.length,4);
  });
  test(`${adapter}: control commits claim before dispatch and concurrent callers share one operation`,async t=>{
    const f=await setup(t,adapter),run=await rawRun(f);const transport=new LocalPayPalTransport(f.store,run.id,noFaults);const original=transport.fetch;
    Object.defineProperty(transport,'fetch',{value:async(...args:Parameters<typeof fetch>)=>{const rows=await f.db.query('SELECT run_id FROM lab_errand_operations WHERE run_id=$1',[run.id]);assert.equal(rows.rowCount,1);return original(...args);}});
    const results=await Promise.all(Array.from({length:6},()=>guardedErrandOrder(f.store,f.session.id,run,transport)));
    assert.equal(results.filter(r=>r.dispatched).length,1);assert.equal((await f.store.resources(run.id)).length,1);
    const cached=await guardedErrandOrder(f.store,f.session.id,run,transport,true);assert.equal(cached.status,'observed');assert.equal(cached.dispatched,false);
  });
  test(`${adapter}: changed arguments, other session, cancelled run and disabled tools cannot dispatch`,async t=>{
    const f=await setup(t,adapter),run=await rawRun(f),transport=new LocalPayPalTransport(f.store,run.id,noFaults);
    const stranger=await f.store.createSession();await assert.rejects(guardedErrandOrder(f.store,stranger.id,run,transport),{code:'RUN_NOT_FOUND'});
    await assert.rejects(callErrandToolkit(transport,randomUUID(),errandArguments,'pay_order'),{code:'ERRAND_TOOL_DENIED'});
    await guardedErrandOrder(f.store,f.session.id,run,transport);const count=(await f.store.resources(run.id)).length;
    await assert.rejects(guardedErrandOrder(f.store,f.session.id,run,transport,true,{...errandArguments,currencyCode:'EUR'}),{code:'ERRAND_PAYLOAD_CONFLICT'});
    await f.db.query('UPDATE lab_runs SET cancelled=1 WHERE id=$1',[run.id]);await assert.rejects(guardedErrandOrder(f.store,f.session.id,run,transport,true),{code:'ERRAND_AUTHORITY_DENIED'});assert.equal((await f.store.resources(run.id)).length,count);
  });
  test(`${adapter}: authentication refusal is never classified as an unknown order`,async t=>{
    const f=await setup(t,adapter),run=await rawRun(f),transport=new LocalPayPalTransport(f.store,run.id,{...noFaults,authFailure:true});
    const outcome=await guardedErrandOrder(f.store,f.session.id,run,transport);assert.equal(outcome.status,'not_sent');assert.equal(outcome.dispatched,false);assert.equal((await f.store.resources(run.id)).length,0);assert.equal((await f.db.query('SELECT id FROM lab_target_attempts WHERE run_id=$1',[run.id])).rowCount,0);
  });
  test(`${adapter}: Toolkit structured refusal remains distinct from unknown transport failure`,async t=>{
    const f=await setup(t,adapter),run=await rawRun(f),transport=new LocalPayPalTransport(f.store,run.id,noFaults);const original=transport.fetch;
    Object.defineProperty(transport,'fetch',{value:async(...args:Parameters<typeof fetch>)=>String(args[0]).endsWith('/v2/checkout/orders')?new Response(JSON.stringify({name:'UNPROCESSABLE_ENTITY',message:'Controlled invalid sample order.'}),{status:422,headers:{'content-type':'application/json'}}):original(...args)});
    const outcome=await guardedErrandOrder(f.store,f.session.id,run,transport);assert.equal(outcome.status,'refused');assert.equal((await f.store.resources(run.id)).length,0);assert.equal((await guardedErrandOrder(f.store,f.session.id,run,transport,true)).dispatched,false);
  });
}
