import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PostgresDatabase,SqliteDatabase } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import type { RunDTO } from "@fracture/contracts";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService,LabStore } from "../packages/service/src/index";
import { LabError } from "../packages/service/src/errors";
import { roadmapScenarios,scenarioCatalogue,scenarios } from "../packages/scenarios/src/index";
process.env.JUDGE_SESSION_SECRET??="fixture-only-signing-key";

const adapters=(process.env.DATABASE_URL?["sqlite","postgres"]:["sqlite"]) as ("sqlite"|"postgres")[];
async function setup(t:TestContext,adapter:"sqlite"|"postgres"){
  const directory=await mkdtemp(join(tmpdir(),"fracture-scenario-"));let db:SqlDatabase;let cleanup=async()=>{};
  if(adapter==="postgres"){const admin=new PostgresDatabase(process.env.DATABASE_URL!);const schema=`scenario_test_${randomUUID().replaceAll("-","")}`;await admin.query(`CREATE SCHEMA ${schema}`);const url=new URL(process.env.DATABASE_URL!);url.searchParams.set("options",`-c search_path=${schema}`);db=new PostgresDatabase(url.toString());cleanup=async()=>{await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.close();};}
  else db=new SqliteDatabase(join(directory,"app.sqlite"));
  await initializeDatabase(db);const store=new LabStore(db);const service=new LabService(store);const session=await store.createSession("owner");
  t.after(async()=>{await db.close();await cleanup();await rm(directory,{recursive:true,force:true});});return {store,service,session};
}
const start=(service:LabService,sessionId:string,scenarioId:string,revision:"faulty"|"hardened")=>service.startRun(sessionId,{projectId:"bramble",scenarioId,revision,mode:"sample",seed:"scenario-catalogue",requestId:randomUUID(),interactive:false});
const verdict=(run:RunDTO,id:string)=>run.invariants.find(row=>row.id===id)?.verdict;
const kinds=(run:RunDTO)=>run.events.map(event=>event.kind);
async function attempts(store:LabStore,runId:string){return (await store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_target_attempts WHERE run_id=$1",[runId])).rows.map(row=>JSON.parse(row.document) as {method:string;path:string;providerRequestId:string|null;genericHeaderPresent:boolean});}

test("catalogue: every listed scenario is click-run Sample or the recorded live pair; the rest is roadmap with a reason",()=>{
  assert.equal(scenarioCatalogue.length,32);assert.equal(scenarios.length+roadmapScenarios.length,scenarioCatalogue.length);
  assert.deepEqual(scenarios.filter(item=>item.catalog==="sample").map(item=>item.id).sort(),["A1","A2","A4","A7","E0","S0","S1","S10","S3","S4","S5","S6","S9"]);
  assert.deepEqual(scenarios.filter(item=>item.catalog==="recorded_live").map(item=>item.id),["L2"]);
  for(const item of scenarios){assert.equal(item.available,item.catalog==="sample");if(item.catalog==="sample"){assert.equal(item.mode,"sample");assert.equal(item.gate,null);}else{assert.ok(item.recorded?.links.some(link=>link.href==="/observations"));assert.ok(item.recorded?.links.some(link=>link.href==="/live-bramble"));}}
  assert.deepEqual(roadmapScenarios.map(item=>item.id).sort(),["A3","A5","A6","L1","L3","L4","L5","L6","L7","L8","N1","N2","N3","S11","S12","S2","S7","S8"]);
  for(const item of roadmapScenarios){assert.equal(item.available,false);assert.ok(item.roadmapReason&&item.roadmapReason.length>20&&item.roadmapReason!=="Not part of this release.",item.id);}
  // The recorded 11 Nov pair was executed under this exact L2 definition.
  assert.equal(scenarioCatalogue.find(item=>item.id==="L2")?.hash,"cc468b6346ef48908a0b2de11e9266e4e7e22cf2c23da07d665d6290b082e23c");
});
for(const adapter of adapters){
  test(`${adapter}: roadmap and recorded cases are refused by the Sample run path`,async t=>{
    const {service,session}=await setup(t,adapter);
    for(const id of ["L1","L2","N1","S8","A5"])await assert.rejects(start(service,session.id,id,"faulty"),(error:unknown)=>error instanceof LabError&&error.code==="SCENARIO_GATED");
    assert.ok((await service.workspace(session)).scenarios.every(item=>item.catalog==="sample"||item.catalog==="recorded_live"));
  });
  test(`${adapter}: A1 generic Idempotency-Key does not deduplicate, SDK PayPal-Request-Id does`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"A1","faulty");const control=await start(service,session.id,"A1","hardened");
    const raw=(await attempts(store,faulty.id)).filter(item=>item.method==="POST");assert.equal(raw.length,4);assert.ok(raw.every(item=>item.genericHeaderPresent&&item.providerRequestId===null));
    assert.equal(faulty.captureCount,2);assert.equal(faulty.orderIds.length,2);assert.equal(faulty.capturedMinor,2400);assert.equal(faulty.verdict,"fail");for(const id of ["I1","I2","I7","I8"])assert.equal(verdict(faulty,id),"fail",id);
    const sdk=(await attempts(store,control.id)).filter(item=>item.method==="POST");assert.ok(sdk.length>=2);assert.ok(sdk.every(item=>typeof item.providerRequestId==="string"));
    // Measured: the pinned SDK also emits its own generic Idempotency-Key. Only the explicit PayPal-Request-Id joined the retry.
    assert.ok(sdk.every(item=>item.genericHeaderPresent));
    assert.equal(control.captureCount,1);assert.equal(control.orderIds.length,1);assert.equal(control.fulfillmentCount,1);assert.equal(control.verdict,"pass");assert.equal(verdict(control,"I8"),"pass");
  });
  test(`${adapter}: A2 changed amount is captured twice by baseline and refused at the control's operation claim`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"A2","faulty");const control=await start(service,session.id,"A2","hardened");
    assert.deepEqual(faulty.captures.map(item=>item.amountMinor).sort(),[1200,1500]);assert.equal(faulty.capturedMinor,2700);assert.equal(verdict(faulty,"I1"),"fail");assert.equal(verdict(faulty,"I2"),"fail");assert.equal(faulty.verdict,"fail");
    assert.ok(kinds(control).includes("changed_payload_refused"));assert.deepEqual(control.captures.map(item=>item.amountMinor),[1200]);assert.equal(control.orderIds.length,1);assert.equal(control.fulfillmentCount,1);assert.equal(control.phoneState,"paid");assert.equal(control.verdict,"pass");
    assert.equal((await attempts(store,control.id)).filter(item=>item.method==="POST"&&item.path==="/v2/checkout/orders").length,1);
  });
  test(`${adapter}: A7 duplicate job delivery buys twice on baseline and once on control`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"A7","faulty");const control=await start(service,session.id,"A7","hardened");
    assert.equal(faulty.captureCount,2);assert.equal(faulty.fulfillmentCount,2);assert.equal(faulty.verdict,"fail");for(const id of ["I1","I2","I3","I8"])assert.equal(verdict(faulty,id),"fail",id);
    assert.equal(control.captureCount,1);assert.equal(control.orderIds.length,1);assert.equal(control.fulfillmentCount,1);assert.equal(control.phoneState,"paid");assert.equal(control.verdict,"pass");
    assert.equal((await attempts(store,control.id)).filter(item=>item.method==="POST"&&item.path==="/v2/checkout/orders").length,1);
  });
  test(`${adapter}: S6 racing partial refunds stay within the capture; only the control reserves before dispatch`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"S6","faulty");const control=await start(service,session.id,"S6","hardened");
    const refundPosts=async(run:RunDTO)=>(await attempts(store,run.id)).filter(item=>item.method==="POST"&&item.path.endsWith("/refund"));
    for(const run of [faulty,control]){assert.equal(run.captureCount,1);assert.equal(run.refunds.length,1);assert.equal(run.refundedMinor,800);assert.equal(verdict(run,"I4"),"pass");}
    const raw=await refundPosts(faulty);assert.equal(raw.length,2);assert.ok(raw.every(item=>item.providerRequestId===null));assert.ok(kinds(faulty).includes("refund_refused_by_provider"));assert.equal(verdict(faulty,"I8"),"fail");assert.equal(faulty.verdict,"fail");
    const reserved=await refundPosts(control);assert.equal(reserved.length,1);assert.equal(typeof reserved[0]!.providerRequestId,"string");assert.equal(kinds(control).filter(kind=>kind==="refund_not_sent").length,1);assert.equal(verdict(control,"I8"),"pass");assert.equal(control.verdict,"pass");
  });
  test(`${adapter}: S9 revoked approval still refunds on baseline and sends nothing on control`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"S9","faulty");const control=await start(service,session.id,"S9","hardened");
    const order=(run:RunDTO,kind:string)=>run.events.find(event=>event.kind===kind)!.sequence;
    assert.equal(faulty.refunds.length,1);assert.equal(faulty.refundedMinor,1200);assert.ok(order(faulty,"refund_planned")<order(faulty,"authority_revoked"));assert.ok(order(faulty,"authority_revoked")<order(faulty,"refund_completed"));assert.ok(kinds(faulty).includes("refund_dispatched_after_revocation"));assert.equal(verdict(faulty,"I8"),"fail");assert.equal(faulty.verdict,"fail");
    assert.equal(control.refunds.length,0);assert.equal(control.refundedMinor,0);assert.ok(kinds(control).includes("refund_not_sent"));assert.ok(kinds(control).includes("refund_withheld_after_revocation"));assert.equal((await attempts(store,control.id)).filter(item=>item.path.endsWith("/refund")).length,0);assert.equal(control.captureCount,1);assert.equal(control.verdict,"pass");
  });
  test(`${adapter}: S1 forged webhook fulfills on baseline and is rejected by the control's signature intake`,async t=>{
    const {store,service,session}=await setup(t,adapter);const faulty=await start(service,session.id,"S1","faulty");const control=await start(service,session.id,"S1","hardened");
    assert.equal(faulty.captureCount,0);assert.equal(faulty.fulfillmentCount,1);assert.equal(faulty.phoneState,"paid");assert.equal(verdict(faulty,"I3"),"fail");assert.equal(verdict(faulty,"I5"),"fail");assert.equal(faulty.verdict,"fail");
    assert.equal(control.captureCount,0);assert.equal(control.fulfillmentCount,0);assert.equal(control.phoneState,"ready");assert.ok(kinds(control).includes("webhook_rejected"));assert.ok(kinds(control).includes("webhook_forgery_rejected"));assert.equal(verdict(control,"I3"),"pass");assert.equal(verdict(control,"I5"),"pass");assert.equal(control.verdict,"pass");
    const deliveries=await store.db.query<{verified:number}&Record<string,unknown>>("SELECT verified FROM paycore_webhook_deliveries WHERE project_id=$1",[control.id]);assert.equal(deliveries.rowCount,1);assert.equal(Number(deliveries.rows[0]!.verified),0);
    for(const run of [faulty,control])assert.equal((await attempts(store,run.id)).length,0);
  });
  test(`${adapter}: the one-click sample campaign admits every click-run Bramble case`,async t=>{
    const {service,session}=await setup(t,adapter);const ids=scenarios.filter(item=>item.available&&item.fixtureIds.includes("bramble")).map(item=>item.id);assert.equal(ids.length,12);
    const campaign=await service.campaign(session.id,{projectId:"bramble",revision:"hardened",scenarioIds:ids,requestId:randomUUID()});assert.equal(campaign.status,"completed");assert.equal(campaign.results.length,12);assert.equal(campaign.counts.fail,0);
  });
}
