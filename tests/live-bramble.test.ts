import test from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteDatabase,PostgresDatabase} from '@fracture/paypal-core';
import {initializeDatabase} from '../packages/service/src/database';
import {LabStore} from '../packages/service/src/store';
import {LiveBramble,liveApprovalOrigins} from '../packages/service/src/live-bramble';
import {LivePayPalGateway,liveResources} from '../packages/service/src/live-provider';
import {executeRun} from '../packages/service/src/executor';

type Order={id:string;status:string;intent:string;purchase_units:{custom_id:string;amount:{currency_code:string;value:string};payments?:{captures:Record<string,unknown>[]}}[]};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
async function setup(t:TestContext,postgres=false){
 const directory=await mkdtemp(join(tmpdir(),'fracture-live-'));let cleanup=async()=>{};let db;
 if(postgres){assert.ok(process.env.DATABASE_URL);const admin=new PostgresDatabase(process.env.DATABASE_URL);const schema='live_test_'+randomUUID().replaceAll('-','');await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(process.env.DATABASE_URL);url.searchParams.set('options',`-c search_path=${schema}`);db=new PostgresDatabase(url.toString());cleanup=async()=>{await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.close();};}else db=new SqliteDatabase(join(directory,'app.sqlite'));await initializeDatabase(db);const store=new LabStore(db);const session=await store.createSession('owner');
 const refunds=new Map<string,Record<string,unknown>>();const orders=new Map<string,Order>();const calls:{method:string;path:string;key:string|null;body:unknown}[]=[];let createUnknown=false,authDenied=false,readUnavailable=false,readsFailAfterCapture=false,cancelAfterCapture=false,pendingCapture=false;
 const network:typeof fetch=async(input,init)=>{
  const req=new Request(input,init);const path=new URL(req.url).pathname;
  if(path==='/v1/oauth2/token')return authDenied?response({error:'invalid_client'},401):response({access_token:'private-fixture-token',token_type:'Bearer',expires_in:3600});
  const body=req.method==='POST'?await req.json():null;calls.push({method:req.method,path,key:req.headers.get('paypal-request-id'),body});
  if(req.method==='POST'){
   const claims=await db.query<{stage:string}&Record<string,unknown>>(path.endsWith('/refund')?"SELECT status AS stage FROM paycore_operations WHERE status='dispatching'":"SELECT stage FROM lab_live_attempts WHERE stage IN ('creating','capturing')");assert.ok(claims.rowCount>0,'durable dispatch claim exists inside outgoing transport');
  }
  if(path==='/v2/checkout/orders'&&req.method==='POST'){
   const id=`ORDER${String(orders.size+1).padStart(5,'0')}`;const b=body as {intent:string;purchase_units:Order['purchase_units']};const order:Order={id,status:'CREATED',intent:b.intent,purchase_units:b.purchase_units};orders.set(id,order);if(createUnknown)throw new TypeError('Controlled unknown original create');return response(order,201);
  }
  const id=path.split('/')[4]!;const order=orders.get(id);
  if(req.method==='GET'&&readUnavailable)throw new TypeError('Controlled unavailable reread');
  if(req.method==='GET'&&path.startsWith('/v2/payments/refunds/'))return response(refunds.get(id));
  if(path.endsWith('/refund')&&req.method==='POST'){const capture=[...orders.values()].flatMap(o=>o.purchase_units[0]?.payments?.captures??[]).find(c=>c.id===id);assert.equal(capture?.status,'COMPLETED');const refund={id:'REFUND'+id,status:'COMPLETED',amount:{currency_code:'USD',value:'12.00'}};refunds.set(refund.id,refund);capture!.status='REFUNDED';return response(refund,201);}
  if(req.method==='GET'&&path.startsWith('/v2/payments/captures/')){const capture=[...orders.values()].flatMap(o=>o.purchase_units[0]?.payments?.captures??[]).find(c=>c.id===id);return response(capture);}
  if(req.method==='GET'&&order)return response({...order,links:[{rel:'approve',method:'GET',href:`https://www.sandbox.paypal.com/checkoutnow?token=${order.id}`}]});
  if(path.endsWith('/capture')&&req.method==='POST'&&order){assert.equal(order.status,'APPROVED');order.status='COMPLETED';order.purchase_units[0]!.payments={captures:[{id:`CAPTURE${id}`,status:pendingCapture?'PENDING':'COMPLETED',amount:{currency_code:'USD',value:'12.00'}}]};if(readsFailAfterCapture)readUnavailable=true;if(cancelAfterCapture)await db.query('UPDATE lab_runs SET cancelled=1 WHERE session_id=$1',[session.id]);return response(order,201);}
  return response({name:'RESOURCE_NOT_FOUND',message:'Fixture only',debug_id:'test'},404);
 };
 const runner=new LiveBramble(store,(_run,observer)=>new LivePayPalGateway({environment:'sandbox',baseUrl:'https://api-m.sandbox.paypal.com',clientId:'test-client',clientSecret:'test-secret',isolatedProject:'test'},observer,network));
 const start=async(revision:'faulty'|'hardened'='faulty',scenarioId='L2')=>(await runner.start(session.id,{requestId:randomUUID(),seed:'live-wire-fixture',revision,scenarioId})).run;
 const approve=(id:string)=>{orders.get(id)!.status='APPROVED';};
 t.after(async()=>{await db.close();await cleanup();await rm(directory,{recursive:true,force:true});});return {db,store,session,runner,start,calls,orders,approve,flags:{createUnknown:()=>{createUnknown=true;},authDenied:()=>{authDenied=true;},readUnavailable:()=>{readUnavailable=true;},readsFailAfterCapture:()=>{readsFailAfterCapture=true;},readsRecover:()=>{readUnavailable=false;},cancelAfterCapture:()=>{cancelAfterCapture=true;},pendingCapture:()=>{pendingCapture=true;}}};
}
test('live phases retain a real response before loss; distinct retry requires another approval',async t=>{
 const x=await setup(t);const run=await x.start();let v=await x.runner.createOrder(x.session.id,run.id,1);const first=v.attempts[0]!.orderId!;
 await assert.rejects(x.runner.capture(x.session.id,run.id,first));assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,0);
 x.approve(first);v=await x.runner.capture(x.session.id,run.id,first);assert.equal(v.run.captureCount,1);assert.equal(v.run.phoneState,'failed');assert.equal(v.run.fulfillmentCount,0);assert.equal(v.attempts[0]!.stage,'response_lost');
 await x.runner.createOrder(x.session.id,run.id,1);assert.equal(x.orders.size,1,'replayed original create cannot silently become the retry');
 v=await x.runner.createOrder(x.session.id,run.id,2);const second=v.attempts[1]!.orderId!;assert.notEqual(first,second);await assert.rejects(x.runner.capture(x.session.id,run.id,second));x.approve(second);v=await x.runner.capture(x.session.id,run.id,second);
 assert.equal(v.run.captureCount,2);assert.equal(v.run.capturedMinor,2400);assert.equal(v.run.fulfillmentCount,1);assert.equal(v.run.verdict,'fail');assert.equal(v.run.source,'live_sandbox');assert.ok(x.calls.filter(c=>c.method==='POST').every(c=>c.key===null));
 const events=v.run.events;assert.ok(events.findIndex(e=>e.kind==='capture_completed')<events.findIndex(e=>e.kind==='response_dropped'));assert.ok(events.findIndex(e=>e.kind==='response_dropped')<events.findIndex(e=>e.kind==='unknown_outcome_presented_failed'));
});
test('hardened actual SDK phases reconcile the original capture and fulfill once',async t=>{
 const x=await setup(t);const run=await x.start('hardened');let v=await x.runner.createOrder(x.session.id,run.id,1);const order=v.attempts[0]!.orderId!;x.approve(order);v=await x.runner.capture(x.session.id,run.id,order);
 assert.equal(v.run.captureCount,1);assert.equal(v.run.fulfillmentCount,1);assert.equal(v.run.phoneState,'paid');assert.equal(v.run.verdict,'pass');assert.equal(v.attempts[0]!.stage,'completed');assert.equal(x.orders.size,1);assert.ok(x.calls.filter(c=>c.method==='POST').every(c=>Boolean(c.key)));assert.ok(x.calls.some(c=>c.path.startsWith('/v2/payments/captures/')&&c.method==='GET'));
 await x.runner.capture(x.session.id,run.id,order);await assert.rejects(x.runner.createOrder(x.session.id,run.id,2));assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,1);assert.equal((await x.store.run(run.id)).fulfillmentCount,1);
});
test('concurrent original callbacks do not repeat one experiment step',async t=>{
 const x=await setup(t);const run=await x.start();await Promise.all(Array.from({length:4},()=>x.runner.createOrder(x.session.id,run.id,1)));assert.equal(x.orders.size,1);const order=(await x.runner.view(x.session.id,run.id)).attempts[0]!.orderId!;x.approve(order);await Promise.allSettled(Array.from({length:4},()=>x.runner.capture(x.session.id,run.id,order)));assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,1);
});
test('session, exact order, amount, expiry and cancellation bind every mutation',async t=>{
 const x=await setup(t);const run=await x.start();const other=await x.store.createSession();await assert.rejects(x.runner.createOrder(other.id,run.id,1));await x.runner.createOrder(x.session.id,run.id,1);const order=(await x.runner.view(x.session.id,run.id)).attempts[0]!.orderId!;
 await assert.rejects(x.runner.capture(x.session.id,run.id,'FOREIGN'));x.approve(order);x.orders.get(order)!.purchase_units[0]!.amount.value='24.00';await assert.rejects(x.runner.capture(x.session.id,run.id,order));x.orders.get(order)!.purchase_units[0]!.amount.value='12.00';await x.db.query('UPDATE lab_runs SET cancelled=1 WHERE id=$1',[run.id]);await assert.rejects(x.runner.capture(x.session.id,run.id,order));assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,0);
 await assert.rejects(executeRun(x.store,run.id,x.session.id),/Sample executor/);
});
test('an unknown create stays protected without a replacement or invented lookup',async t=>{
 const x=await setup(t);x.flags.createUnknown();const run=await x.start();const v=await x.runner.createOrder(x.session.id,run.id,1);assert.equal(v.attempts[0]!.stage,'unknown');assert.equal(v.attempts[0]!.orderId,null);await x.runner.createOrder(x.session.id,run.id,1);await assert.rejects(x.runner.createOrder(x.session.id,run.id,2));assert.equal(x.orders.size,1);assert.equal(x.calls.filter(c=>c.method==='GET').length,0);
});
test('never-sent authentication is distinct and issues no original-resource reads',async t=>{
 const x=await setup(t);x.flags.authDenied();const run=await x.start();const v=await x.runner.createOrder(x.session.id,run.id,1);assert.equal(v.attempts[0]!.stage,'refused');assert.equal(x.calls.length,0);
});
test('public live resource parsing omits payer details and credentials',()=>{
 const r=liveResources({id:'ORDER1',status:'COMPLETED',payer:{email_address:'never-public@example.test'},purchase_units:[{custom_id:'purchase1',amount:{currency_code:'USD',value:'12.00'},payments:{captures:[{id:'CAP1',status:'COMPLETED',amount:{currency_code:'USD',value:'12.00'}}]}}]},'/v2/checkout/orders/ORDER1');assert.equal(r.length,2);assert.equal(r[1]?.parentId,'ORDER1');assert.ok(!JSON.stringify(r).includes('never-public'));assert.equal(r[0]?.money?.minor,1200);
});

test('read-only recovery completes the original hardened payment after unavailable reads',async t=>{
 const x=await setup(t);const run=await x.start('hardened');const created=await x.runner.createOrder(x.session.id,run.id,1);const id=created.attempts[0]!.orderId!;x.approve(id);x.flags.readsFailAfterCapture();let v=await x.runner.capture(x.session.id,run.id,id);assert.equal(v.attempts[0]?.stage,'unknown');assert.equal(v.run.fulfillmentCount,0);assert.equal(v.run.phoneState,'checking');const writes=x.calls.filter(c=>c.method==='POST').length;x.flags.readsRecover();v=await x.runner.reconcile(x.session.id,run.id);assert.equal(v.run.fulfillmentCount,1);assert.equal(v.run.phoneState,'paid');assert.equal(v.attempts[0]?.stage,'completed');await x.runner.reconcile(x.session.id,run.id);assert.equal(x.calls.filter(c=>c.method==='POST').length,writes);assert.equal((await x.store.run(run.id)).fulfillmentCount,1);
});
test('recovery never repairs the faulty target from privileged lab knowledge',async t=>{
 const x=await setup(t);const run=await x.start();const created=await x.runner.createOrder(x.session.id,run.id,1);const id=created.attempts[0]!.orderId!;x.approve(id);await x.runner.capture(x.session.id,run.id,id);const writes=x.calls.filter(c=>c.method==='POST').length;const v=await x.runner.reconcile(x.session.id,run.id);assert.equal(v.run.phoneState,'failed');assert.equal(v.run.fulfillmentCount,0);assert.equal(v.attempts[0]?.stage,'response_lost');assert.equal(x.calls.filter(c=>c.method==='POST').length,writes);
});
test('cancellation after an already-sent capture prevents fulfillment but retains its money',async t=>{
 const x=await setup(t);const run=await x.start('hardened');const created=await x.runner.createOrder(x.session.id,run.id,1);const id=created.attempts[0]!.orderId!;x.approve(id);x.flags.cancelAfterCapture();let v=await x.runner.capture(x.session.id,run.id,id);assert.equal(v.run.capturedMinor,1200);assert.equal(v.run.fulfillmentCount,0);assert.equal(v.run.stage,'cancelled_reconciled');v=await x.runner.reconcile(x.session.id,run.id);assert.equal(v.run.fulfillmentCount,0);assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,1);
});
test('expired authority and changed source are refused before any provider dispatch',async t=>{
 const x=await setup(t);const run=await x.start();await x.store.updateRun(run.id,r=>({...r,createdAt:new Date(Date.now()-3600001).toISOString()}));await assert.rejects(x.runner.createOrder(x.session.id,run.id,1),/authority|cannot dispatch/i);assert.equal(x.calls.length,0);await x.store.updateRun(run.id,r=>({...r,createdAt:new Date().toISOString(),sourceHash:'changed'}));await assert.rejects(x.runner.createOrder(x.session.id,run.id,1),/implementation changed/);assert.equal(x.calls.length,0);
});
test('pending provider capture cannot release a digital book',async t=>{
 const x=await setup(t);const run=await x.start('hardened');const created=await x.runner.createOrder(x.session.id,run.id,1);const id=created.attempts[0]!.orderId!;x.approve(id);x.flags.pendingCapture();const v=await x.runner.capture(x.session.id,run.id,id);assert.equal(v.run.fulfillmentCount,0);assert.equal(v.run.capturedMinor,0);assert.equal(v.run.phoneState,'checking');assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,1);
});
test('rolling capture reservations include unknown outcomes and refuse a seventh dispatch',async t=>{
 const x=await setup(t);const run=await x.start('hardened');const created=await x.runner.createOrder(x.session.id,run.id,1);const id=created.attempts[0]!.orderId!;x.approve(id);for(let i=0;i<6;i++)await x.db.query('INSERT INTO lab_live_attempts(run_id,session_id,attempt,stage,created_at,capture_at,lease_until,document) VALUES($1,$2,1,$3,$4,$4,NULL,$5)',[randomUUID(),x.session.id,'unknown',new Date().toISOString(),'{}']);await assert.rejects(x.runner.capture(x.session.id,run.id,id),/six capture slots/);assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,0);
});
test('PostgreSQL concurrent callbacks preserve one claimed original order and capture', {skip:!process.env.DATABASE_URL},async t=>{
 const x=await setup(t,true);const run=await x.start('hardened');await Promise.all(Array.from({length:6},()=>x.runner.createOrder(x.session.id,run.id,1)));assert.equal(x.orders.size,1);const id=(await x.runner.view(x.session.id,run.id)).attempts[0]!.orderId!;x.approve(id);await Promise.allSettled(Array.from({length:6},()=>x.runner.capture(x.session.id,run.id,id)));assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,1);assert.equal((await x.store.run(run.id)).fulfillmentCount,1);
});

async function duplicate(x:Awaited<ReturnType<typeof setup>>){const run=await x.start();for(const attempt of [1,2] as const){const v=await x.runner.createOrder(x.session.id,run.id,attempt);const id=v.attempts.at(-1)!.orderId!;x.approve(id);await x.runner.capture(x.session.id,run.id,id);}return x.store.run(run.id);}
test('explicit duplicate compensation refunds exactly once and preserves both original charges',async t=>{
 const x=await setup(t);const run=await duplicate(x);const capture=run.captures[1]!.id;const other=await x.store.createSession();await assert.rejects(x.runner.compensate(other.id,run.id,capture));await assert.rejects(x.runner.compensate(x.session.id,run.id,run.captures[0]!.id));await Promise.all(Array.from({length:4},()=>x.runner.compensate(x.session.id,run.id,capture)));let v=await x.runner.view(x.session.id,run.id);assert.equal(v.run.capturedMinor,2400);assert.equal(v.run.refundedMinor,1200);assert.equal(v.run.captureCount,2);assert.equal(v.run.verdict,'fail');assert.equal(v.run.remediation,'completed');assert.equal(v.compensation?.status,'succeeded');assert.equal(v.run.refunds[0]?.captureId,capture);assert.equal(x.calls.filter(c=>c.path.endsWith('/refund')&&c.method==='POST').length,1);assert.ok(x.calls.find(c=>c.path.endsWith('/refund'))?.key);await x.runner.compensate(x.session.id,run.id,capture);assert.equal(x.calls.filter(c=>c.path.endsWith('/refund')&&c.method==='POST').length,1);
});
test('compensation denies a changed original capture before a refund dispatch',async t=>{
 const x=await setup(t);const run=await duplicate(x);const capture=run.captures[1]!;x.orders.get(capture.orderId)!.purchase_units[0]!.payments!.captures[0]!.status='PARTIALLY_REFUNDED';await assert.rejects(x.runner.compensate(x.session.id,run.id,capture.id),/no longer has/);assert.equal(x.calls.filter(c=>c.path.endsWith('/refund')&&c.method==='POST').length,0);
});

test('same-tab approval uses the provider original link and freezes an allowed return origin',async t=>{
 const x=await setup(t);const run=await x.start('hardened');await assert.rejects(x.runner.approvalLink(x.session.id,run.id,1,'https://untrusted.example'),/return origin/);assert.equal(x.calls.length,0);const result=await x.runner.approvalLink(x.session.id,run.id,1,'http://localhost:4104');assert.equal(result.url,`https://www.sandbox.paypal.com/checkoutnow?token=${result.view.attempts[0]!.orderId}`);await x.runner.approvalLink(x.session.id,run.id,1,'http://localhost:4104');assert.equal(x.orders.size,1);const sent=x.calls.find(c=>c.method==='POST')!.body as {payment_source:{paypal:{experience_context:{return_url:string;cancel_url:string;shipping_preference:string}}}};assert.equal(new URL(sent.payment_source.paypal.experience_context.return_url).origin,'http://localhost:4104');assert.equal(sent.payment_source.paypal.experience_context.shipping_preference,'NO_SHIPPING');assert.equal(x.calls.filter(c=>c.path.endsWith('/capture')).length,0);assert.ok(liveApprovalOrigins().includes('http://localhost:4104'));
});
