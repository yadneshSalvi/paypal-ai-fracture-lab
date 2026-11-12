import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { ProjectDTO, RunDTO, ScenarioDTO } from "@fracture/contracts";
import { aggregateVerdict, evaluateRun } from "../../invariants/src/index";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
import { retryScenarios, scenarioFaults } from "../../scenarios/src/index";
import { faultyCheckout } from "../../../apps/fixtures/bramble/faulty";
import { hardenedCheckout } from "../../../apps/fixtures/bramble/hardened";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import { LabStore } from "./store";
import type { RunInput } from "./types";
import { executeErrand } from '../../../apps/fixtures/errand/execute';
import { recipeFaults } from "../../campaigns/src/recipes";
import { assertCampaignDispatch } from "../../campaigns/src/gate";
import type { CampaignExecutionLease } from "../../campaigns/src/gate";

export function newRun(input:RunInput,scenario:ScenarioDTO,project:ProjectDTO):RunDTO{
  const now=new Date().toISOString();return {id:randomUUID(),projectId:project.id,projectName:project.name,revision:input.revision,sourceHash:project.revisions.find(revision=>revision.id===input.revision)?.sourceHash??project.sourceHash,scenarioId:scenario.id,scenarioTitle:scenario.title,scenarioHash:scenario.hash,seed:input.seed,stage:"created",verdict:"inconclusive",source:input.mode,faultSource:scenario.faultSource,createdAt:now,updatedAt:now,durationMs:0,businessIntentId:`purchase-${randomUUID()}`,amountMinor:1200,currency:"USD",captureCount:0,capturedMinor:0,refundedMinor:0,fulfillmentCount:0,phoneState:"ready",applicationStatus:"UNPAID",providerStatus:"NO PAYMENT",orderIds:[],captures:[],refunds:[],events:[],invariants:[],diagnosis:null,repairIds:[],comparisonRunId:null,remediation:"not_needed",summary:"Experiment created; no payment observation yet.",limitations:["Sample: a persistent local provider model. No real money or provider request occurs.","The real pinned SDK serializes the hardened target; the faulty target uses independent raw HTTP.","A scripted local buyer explicitly approves each distinct order. This is not a real buyer approval."],nextAction:"Run the purchase"};
}

export async function refreshRun(store:LabStore,runId:string,terminal=true){
  const current=await store.run(runId);const resources=await store.resources(runId);const projection=await store.projection(current);const fulfillments=await store.db.query<{capture_id:string;intent_id:string}&Record<string,unknown>>("SELECT capture_id,intent_id FROM lab_fulfillments WHERE run_id=$1",[runId]);
  const sorted=[...resources].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const proof=(id:string)=>current.events.find(event=>event.resourceId===id&&event.lane==="provider")?.evidenceIds[0]??"";
  const evaluated={...current,...projection,updatedAt:new Date().toISOString()};const invariants=evaluateRun(evaluated,resources,fulfillments.rows);const verdict=aggregateVerdict(invariants);
  return store.updateRun(runId,run=>({...run,...projection,orderIds:sorted.filter(item=>item.kind==="order").map(item=>item.id),captures:sorted.filter(item=>item.kind==="capture").map(item=>({id:item.id,orderId:item.parentId??"",status:item.status,amountMinor:item.money?.minor??0,currency:item.money?.currency??run.currency,observedAt:item.observedAt,source:item.source,evidenceId:proof(item.id)})),refunds:sorted.filter(item=>item.kind==="refund").map(item=>({id:item.id,captureId:item.parentId??"",status:item.status,amountMinor:item.money?.minor??0,currency:item.money?.currency??run.currency,observedAt:item.observedAt,source:item.source,evidenceId:proof(item.id)})),invariants,verdict,stage:terminal?(verdict==="inconclusive"?"inconclusive":"completed"):run.stage,durationMs:Math.max(0,Date.now()-Date.parse(run.createdAt)),remediation:run.remediation==="completed"?"completed":projection.captureCount>1?"approval_required":"not_needed",summary:projection.captureCount>1?"Two completed captures belong to one $12 purchase. The original failure remains visible.":projection.phoneState==="checking"?"The purchase remains uncertain. No extra charge or download was issued.":verdict==="pass"?"One durable intent, confirmed provider state, and at most one book.":"The persisted trace contains a reproducible target defect.",nextAction:terminal?(projection.captureCount>1?"Diagnose the mismatch":"Inspect the evidence"):run.nextAction}));
}

export async function executeRun(store:LabStore,runId:string,sessionId:string,campaignLease?:CampaignExecutionLease){
  if((await store.run(runId,sessionId)).source!=='sample')throw new Error('The Sample executor cannot execute a live provider run.');
  await store.record(runId,sessionId);const owner=randomUUID();const job=await store.claimJob(runId,owner);if(!job)return store.run(runId,sessionId);
  let jobState="completed";
  try{
    const row=await store.record(runId,sessionId);let run=await store.run(runId,sessionId);
    if(sha256(canonicalJson(job.input))!==row.input_hash)throw new Error("The durable run inputs no longer match their original claim.");
    if(row.cancelled)return run;
    if(job.recovering&&row.checkpoint.includes("dispatching")){
      await store.emit(runId,{lane:"lab",kind:"worker_recovery_uncertain",title:"Recovered an interrupted worker",detail:"The prior worker ended at a write boundary. Its command is not blindly replayed; persisted resources and history are retained.",facts:{checkpoint:row.checkpoint}});
      const recovered=await refreshRun(store,runId,false);return store.updateRun(runId,item=>({...item,stage:"inconclusive",verdict:"inconclusive",summary:"An interrupted write requires explicit reconciliation.",nextAction:"Run a read-only diagnosis",limitations:[...recovered.limitations,"Worker recovery stopped at a potentially dispatched write; no automatic new order was attempted."]}),"recovery_required");
    }
    if(run.projectId==='errand')return await executeErrand(store,run,sessionId,owner);
    if(job.input.executionRecipe&&!job.input.campaign)throw new Error("A reduction recipe requires its original campaign authority.");
    if(job.input.campaign&&!campaignLease)throw new Error("Campaign execution requires its current worker lease.");
    const dispatchGuard=job.input.campaign?async(tx:import("@fracture/paypal-core").SqlConnection)=>assertCampaignDispatch(tx,job.input.campaign!,runId,sessionId,campaignLease!):undefined;
    const transport=new LocalPayPalTransport(store,runId,job.input.executionRecipe?recipeFaults(job.input.executionRecipe):scenarioFaults(run.scenarioId),owner,dispatchGuard);const context:BrambleContext={run,sessionId,store,transport};const checkout=run.revision==="faulty"?faultyCheckout:hardenedCheckout;
    if(row.checkpoint==="start"||row.checkpoint==="preflight"){
      await store.stage(runId,"preflight","preflight");
      await store.emit(runId,{lane:"lab",kind:"preflight",title:"The experiment is isolated",detail:"This run owns its provider model, purchase intent and durable observations. Fault injection cannot add idempotency to the faulty target.",facts:{source:"sample",scenarioHash:run.scenarioHash,sourceHash:run.sourceHash,seed:run.seed,revision:run.revision,...(job.input.campaign?{campaign:job.input.campaign,recipe:job.input.executionRecipe??null}:{})}});
      await store.stage(runId,"executing","first_dispatching");await checkout(context);await store.stage(runId,"observing","first_observed");
    }
    run=await refreshRun(store,runId,false);let state=await store.targetState(runId,run.businessIntentId);
    const retryAllowed=job.input.executionRecipe?job.input.executionRecipe.components.includes("customer_retry"):retryScenarios.has(run.scenarioId);
    const shouldRetry=run.revision==="faulty"&&retryAllowed&&state.status==="failed"&&run.captureCount>0;
    if(shouldRetry&&job.input.interactive&&row.checkpoint!=="retry_queued"){
      jobState="waiting";return store.updateRun(runId,item=>({...item,stage:"awaiting_approval",nextAction:"Try again in Bramble",summary:"The shop says payment failed, but one capture already completed. The next customer retry is waiting for you."}),"awaiting_retry");
    }
    if(shouldRetry){
      await store.emit(runId,{lane:"customer",kind:"customer_retry",title:"Maya tries the same purchase again",detail:"The customer follows the shop's failure message. The business intent stays the same.",facts:{businessIntentId:run.businessIntentId,scriptedSampleCustomer:true}});
      await store.stage(runId,"executing","retry_dispatching");await checkout(context);await store.stage(runId,"observing","retry_observed");state=await store.targetState(runId,run.businessIntentId);
    }
    await store.stage(runId,"evaluating","evaluating");await store.emit(runId,{lane:"lab",kind:"evaluation_started",title:"Compare intent with committed resources",detail:"Eight invariants inspect gross capture history, entitlement backing, uncertainty, and mutation identity. Refunds do not erase earlier failures.",facts:{targetState:state.status}});
    await store.updateRun(runId,item=>item,"done");return refreshRun(store,runId);
  }catch(error){
    jobState="failed";await store.emit(runId,{lane:"lab",kind:"executor_failed",title:"The experiment runner stopped",detail:"An infrastructure error prevented completion. This is not evidence that the target passed.",facts:{errorName:error instanceof Error?error.name:"UnknownError"}});
    await refreshRun(store,runId,false);await store.updateRun(runId,run=>({...run,stage:"failed_infrastructure",verdict:"inconclusive",summary:"Infrastructure interrupted this experiment; inspect the persisted observations.",nextAction:"Inspect the saved run"}),"infrastructure_failed");
    throw error;
  }finally{await store.finishJob(runId,owner,jobState);}
}
