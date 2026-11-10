import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SqliteDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService,LabStore,LabError } from "../packages/service/src/index";
import { OpenAIModel } from "../packages/ai/src/model";
import type { ModelCall,ModelReceipt,ModelResponse } from "../packages/ai/src/model";
import { modelDiagnosis } from "../packages/ai/src/diagnosis";
process.env.JUDGE_SESSION_SECRET??="fixture-only-signing-key";
process.env.OPENAI_PLANNER_MODEL??="fixture-model";
process.env.OPENAI_API_KEY??="fixture-provider-key-no-network";
async function setup(t:TestContext){const directory=await mkdtemp(join(tmpdir(),"fracture-model-"));const db=new SqliteDatabase(join(directory,"db.sqlite"));await initializeDatabase(db);const store=new LabStore(db);const service=new LabService(store);const session=await store.createSession("owner");const run=await service.startRun(session.id,{projectId:"bramble",scenarioId:"S0",revision:"faulty",mode:"sample",seed:"model-contract-test",requestId:randomUUID(),interactive:false});t.after(async()=>{await db.close();await rm(directory,{recursive:true,force:true});});return {db,store,service,session,run};}
class FixtureModel extends OpenAIModel {
  calls:ModelCall[]=[];foreign=false;
  override async call(_sessionId:string,_runId:string|null,call:ModelCall):Promise<ModelReceipt>{
    this.calls.push(call);const input=call.input as {allowedOrderIds:string[]};const response:ModelResponse={id:randomUUID(),model:"fixture-model-output",status:"completed",output:call.role==="diagnosis_tool_selection"?[{type:"function_call",name:call.toolName!,call_id:randomUUID(),arguments:JSON.stringify({orderId:this.foreign?"FOREIGN-ORDER":input.allowedOrderIds[0],hypotheses:[{id:"unpaid",title:"No payment",reason:"Requires a read"},{id:"lost",title:"Lost answer",reason:"Requires a read"}]})}]:[{type:"message",content:[{type:"output_text",text:JSON.stringify({hypotheses:[{id:"unpaid",title:"No payment",status:"eliminated",reason:"The read found a completed order."},{id:"lost",title:"Lost answer",status:"supported",reason:"The trace and resource read agree."}],conclusion:"Reconcile the original purchase before another order."})}]}]};return {attemptId:randomUUID(),evidenceId:randomUUID(),response,durationMs:0,inputHash:"fixture"};
  }
}
test("model-selected diagnosis performs a real scoped read and cannot dispatch money",async t=>{
  const {store,session,run}=await setup(t);const model=new FixtureModel(store);const before=await store.resources(run.id);const diagnosis=await modelDiagnosis(store,session.id,run,model);assert.equal(diagnosis.status,"tested");assert.equal(diagnosis.model,"fixture-model-output");assert.equal(diagnosis.experiment.observedStatus,"COMPLETED");assert.equal(model.calls.length,2);assert.ok(model.calls[0]?.tools?.every(tool=>tool.name==="read_owned_order"));const after=await store.resources(run.id);assert.deepEqual(after,before);assert.ok((await store.run(run.id)).events.some(event=>event.kind==="resource_read"));assert.ok((await store.evidence(session.id)).some(evidence=>evidence.id===diagnosis.experiment.receiptId));
});
test("an out-of-scope model tool argument is rejected before resource access",async t=>{
  const {store,session,run}=await setup(t);const model=new FixtureModel(store);model.foreign=true;const before=run.events.length;await assert.rejects(modelDiagnosis(store,session.id,run,model),(error:unknown)=>error instanceof LabError&&error.code==="MODEL_RESOURCE_DENIED");assert.equal((await store.run(run.id)).events.length,before);assert.equal((await store.run(run.id)).diagnosis,null);assert.equal(model.calls.length,1);
});
test("model transport persists attempts without authorization and excludes private reasoning",async t=>{
  const {store,session,run}=await setup(t);const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY="fixture-secret-never-persist";t.after(()=>{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;});
  const mock:typeof fetch=async(_input,init)=>{assert.ok(new Headers(init?.headers).has("authorization"));return Response.json({id:"fixture-response",model:"fixture-model",status:"completed",usage:{input_tokens:20,output_tokens:4},output:[{type:"reasoning",content:[{type:"output_text",text:"private-reasoning-marker"}]},{type:"message",content:[{type:"output_text",text:'{"result":"ok"}'}]}]});};
  const receipt=await new OpenAIModel(store,mock).call(session.id,run.id,{role:"fixture",model:"fixture-model",instructions:"Return a typed test result.",input:{source:"sample"}});const rows=await store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_model_attempts WHERE id=$1",[receipt.attemptId]);const published=JSON.stringify(await store.evidence(session.id));assert.ok(!rows.rows[0]!.document.includes("fixture-secret-never-persist"));assert.ok(!rows.rows[0]!.document.includes("private-reasoning-marker"));assert.ok(!published.includes("fixture-secret-never-persist"));assert.ok(!published.includes("private-reasoning-marker"));assert.equal(receipt.response.usage?.input_tokens,20);
});
test("incomplete model response remains a failed retained attempt including usage",async t=>{
  const {store,session,run}=await setup(t);const mock:typeof fetch=async()=>Response.json({id:"incomplete",model:"fixture-model",status:"incomplete",usage:{input_tokens:100,output_tokens:60},incomplete_details:{reason:"max_output_tokens"},output:[]});
  await assert.rejects(new OpenAIModel(store,mock).call(session.id,run.id,{role:"fixture",model:"fixture-model",instructions:"Test",input:{}}),(error:unknown)=>error instanceof LabError&&error.code==="MODEL_INCOMPLETE");const rows=await store.db.query<{status:string;document:string}&Record<string,unknown>>("SELECT status,document FROM lab_model_attempts WHERE run_id=$1",[run.id]);assert.equal(rows.rows[0]?.status,"failed");assert.equal(JSON.parse(rows.rows[0]!.document).providerResponse.usage.output_tokens,60);assert.equal((await store.run(run.id)).diagnosis,null);
});
test("SQL cancellation aborts an in-flight model request and prevents late publication",async t=>{
  const {store,session,run}=await setup(t);const actionId=randomUUID();await store.claimAction(session.id,run.id,actionId,"diagnose",{});let begun:()=>void=()=>{};const started=new Promise<void>(resolve=>{begun=resolve;});const mock:typeof fetch=async(_input,init)=>new Promise<Response>((_resolve,reject)=>{begun();init?.signal?.addEventListener("abort",()=>reject(new DOMException("Cancelled","AbortError")),{once:true});});
  const pending=new OpenAIModel(store,mock,actionId).call(session.id,run.id,{role:"fixture",model:"fixture-model",instructions:"Test",input:{}});const rejection=assert.rejects(pending,(error:unknown)=>error instanceof LabError&&error.code==="WORK_CANCELLED");await started;await store.db.query("UPDATE lab_actions SET stage='cancelled' WHERE id=$1",[actionId]);await rejection;const rows=await store.db.query<{status:string}&Record<string,unknown>>("SELECT status FROM lab_model_attempts WHERE run_id=$1",[run.id]);assert.equal(rows.rows[0]?.status,"cancelled");assert.equal((await store.run(run.id)).diagnosis,null);
});
test("cancelled authority and diagnosis commit are checked atomically",async t=>{
  const {store,session,run}=await setup(t);const actionId=randomUUID();await store.claimAction(session.id,run.id,actionId,"diagnose",{});await store.db.query("UPDATE lab_actions SET stage='cancelled' WHERE id=$1",[actionId]);await assert.rejects(store.completeDiagnosis(session.id,run.id,{id:randomUUID(),runId:run.id,status:"tested",hypotheses:[],experiment:{title:"test",tool:"read",resourceId:"",observedStatus:null,receiptId:null},conclusion:"late answer",model:"fixture",source:"sample"},actionId),(error:unknown)=>error instanceof LabError&&error.code==="WORK_CANCELLED");assert.equal((await store.run(run.id)).diagnosis,null);await store.finishAction(actionId,session.id);assert.equal((await store.db.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1",[actionId])).rows[0]?.stage,"cancelled");
});
