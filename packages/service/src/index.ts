import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { CampaignDTO, DiagnosisDTO, EvidenceDTO, RunDTO, WorkspaceDTO } from "@fracture/contracts";
import { LocalSdkAdapter, fixtureCommand, fixtureCore } from "../../../apps/fixtures/bramble/hardened";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
import { scenarioCatalogue, scenarios } from "../../scenarios/src/index";
import { campaignControlForRun, campaignFaultsForRun } from "../../campaigns/src/followups";
import { contractRows, evaluationProtocol, projectCatalog, providerFacts, publishedEvidence } from "./catalog";
import { getDatabase } from "./database";
import { LabError } from "./errors";
import { executeRun, newRun, refreshRun } from "./executor";
import { proposeReferenceRepair, verifyReferenceRepair } from "./repairs";
import { LabStore } from "./store";
import { noFaults } from "./types";
import { modelDiagnosis } from "../../ai/src/diagnosis";
import { queueRepairJob } from "./generated-repairs";
import { OpenAIModel } from "../../ai/src/model";
import type { LabSession, RunInput } from "./types";
import { errandWorkspace } from "../../../apps/fixtures/errand/execute";
export { LabStore, LabError };
export type { LabSession, RunInput };

export class LabService {
  constructor(readonly store:LabStore){}
  async startRun(sessionId:string,input:RunInput){
    if(input.mode!=="sample")throw new LabError("LIVE_GATE","Live experiments require fresh scoped buyer authority and a qualified hosted runner. This endpoint currently executes Sample scenarios.",409);
    const scenario=scenarioCatalogue.find(item=>item.id===input.scenarioId);if(!scenario)throw new LabError("SCENARIO_NOT_FOUND","Scenario not found.",404);if(!scenario.available)throw new LabError("SCENARIO_GATED",scenario.gate??"This case is not a click-run Sample scenario in this release.",409);
    const project=(await projectCatalog([])).find(item=>item.id===input.projectId);if(!project||!scenario.fixtureIds.includes(project.id))throw new LabError("FIXTURE_MISMATCH","This scenario does not support the selected fixture.",409);
    const created=await this.store.createRun(sessionId,input,newRun(input,scenario,project));await executeRun(this.store,created.run.id,sessionId);return this.store.run(created.run.id,sessionId);
  }
  async seedSession(session:LabSession){
    if(session.seeded)return;
    const seed=`bramble-welcome-${session.id.slice(0,8)}`;
    const control=await this.startRun(session.id,{projectId:"bramble",scenarioId:"S0",revision:"hardened",mode:"sample",seed,requestId:`welcome-control:${session.id}`,interactive:false});
    const faulty=await this.startRun(session.id,{projectId:"bramble",scenarioId:"S0",revision:"faulty",mode:"sample",seed,requestId:`welcome-faulty:${session.id}`,interactive:true});
    await this.store.updateRun(control.id,run=>({...run,comparisonRunId:faulty.id}));await this.store.updateRun(faulty.id,run=>({...run,comparisonRunId:control.id}));
    await this.store.db.query("UPDATE lab_sessions SET seeded=1,selected_run_id=$2 WHERE id=$1",[session.id,faulty.id]);
  }
  async workspace(session:LabSession):Promise<WorkspaceDTO>{
    const [runs,campaigns,repairs,records,published,rows]=await Promise.all([this.store.runs(session.id),this.store.campaigns(session.id),this.store.repairs(session.id),this.store.evidence(session.id),publishedEvidence(),contractRows()]);const current=await this.store.session(session.id);const projects=await projectCatalog(runs);
    const actionRows=await this.store.db.query<{id:string;run_id:string;action:string;stage:string;created_at:string}&Record<string,unknown>>("SELECT id,run_id,action,stage,created_at FROM lab_actions WHERE session_id=$1 ORDER BY created_at DESC LIMIT 100",[session.id]);
    // Progress needs metadata only. Full immutable requests/responses can be hundreds of KB.
    const startedAt=this.store.db.dialect==="postgres"?"document::jsonb->>'startedAt'":"json_extract(document, '$.startedAt')";
    const modelRows=await this.store.db.query<{run_id:string;role:string;status:string;started_at:string|null}&Record<string,unknown>>(`SELECT run_id,role,status,${startedAt} AS started_at FROM lab_model_attempts WHERE session_id=$1`,[session.id]);
    const repairJobs=await this.store.db.query<{action_id:string;stage:string;error_code:string|null}&Record<string,unknown>>("SELECT action_id,stage,error_code FROM lab_repair_jobs WHERE session_id=$1",[session.id]);
    const work=actionRows.rows.map(action=>{const attempts=modelRows.rows.filter(attempt=>attempt.run_id===action.run_id&&attempt.started_at!==null&&attempt.started_at>=action.created_at);const latest=attempts.sort((a,b)=>String(a.started_at).localeCompare(String(b.started_at))).at(-1);const job=repairJobs.rows.find(item=>item.action_id===action.id);return {id:action.id,runId:action.run_id,kind:action.action,status:action.stage,startedAt:action.created_at,phase:job?.error_code?job.error_code:action.stage!=="running"?action.stage:job?.stage==="queued"&&latest?.status!=="running"?"Waiting for the durable repair worker":action.action==="verify_generated"?"Executing the exact candidate in isolation":latest?.role==="repair_contract_plan"?"Binding the complete contract context":latest?.role==="repair_candidate_source"?"Astra is authoring a grounded candidate":latest?.role==="diagnosis_conclusion"?"Astra is interpreting the resource receipt":latest?.status==="completed"?"Reading the original provider resource":latest?.role==="diagnosis_tool_selection"?"Astra is choosing a read-only experiment":"Preparing scoped evidence"};});
    const evaluation=await evaluationProtocol();
    return {version:"1.0",repairExecution:process.env.VERCEL === "1"?(process.env.FRACTURE_REPAIR_SNAPSHOT_ID?"cloud_isolated":"unavailable"):"local_isolated",work,sessionId:session.id,createdAt:session.createdAt,source:"sample",policy:{sandboxOnly:true,maxCaptures:6,maxGrossMinor:7200,currency:"USD",liveEnabled:false,reason:"This workspace executes isolated Sample scenarios. Live writes require separately qualified, fresh buyer authority."},projects,scenarios,runs,campaigns,repairs,providerFacts:providerFacts(published),contractRows:rows,evaluations:[evaluation],evidence:[...records,...published],errand:errandWorkspace(runs),selectedRunId:current?.selectedRunId??null,metrics:[{name:"Executed runs",value:String(runs.length),detail:"Persisted in this isolated session",source:"sample"},{name:"Available scenarios",value:String(scenarios.filter(item=>item.available).length),detail:"Click-run Sample cases against the local provider model",source:"sample"},{name:"Context attempts",value:`${evaluation.completedAttempts} / 600`,detail:evaluation.status==="completed"?"Sealed first-submission outcomes":evaluation.status==="running"?"Execution in progress; comparisons withheld":"Protocol frozen before inference",source:"sample"}]};
  }
  async diagnose(sessionId:string,runId:string){
    const run=await this.store.run(runId,sessionId);if(run.source!=="sample")throw new LabError("LIVE_DIAGNOSIS_GATE","Use the live original-resource reconciliation for this run.",409);const context={run,sessionId,store:this.store,transport:new LocalPayPalTransport(this.store,runId,await campaignFaultsForRun(this.store,run,sessionId))};const orderId=run.orderIds[0];let status:string|null=null;let receiptId:string|null=null;let captureIds:string[]=[];
    if(orderId){try{const resources=await new LocalSdkAdapter(context).read("order",orderId);status=resources.find(resource=>resource.kind==="order")?.status??null;captureIds=resources.filter(resource=>resource.kind==="capture").map(resource=>resource.id);const body={tool:"ordersGetOrder",orderId,resources,readOnly:true,source:"sample"};const evidence:EvidenceDTO={id:randomUUID(),runId,title:"Read-only diagnosis receipt",kind:"receipt",source:"sample",createdAt:new Date().toISOString(),sha256:sha256(canonicalJson(body)),summary:"The SDK reread the original order through the local provider boundary.",body,redactions:["No credentials are captured."]};receiptId=evidence.id;await this.store.addEvidence(sessionId,evidence);}catch{status=null;}}
    const firstSucceeded=status==="COMPLETED";const diagnosis:DiagnosisDTO={id:randomUUID(),runId,status:receiptId?"tested":"proposed",hypotheses:[{id:"not-paid",title:"The original payment never completed",status:firstSucceeded?"eliminated":"possible",reason:firstSucceeded?"An authoritative reread returned the original completed order.":"The target has not obtained a conclusive resource reread."},{id:"lost-answer",title:"The first payment completed but its answer was lost",status:firstSucceeded&&run.events.some(event=>event.kind==="response_dropped")?"supported":"possible",reason:firstSucceeded?"Resource receipt and response-drop observation support this explanation.":"The missing response alone cannot establish payment completion."},{id:"new-purchase",title:"Retry created a different order for the same purchase",status:run.orderIds.length>1?"supported":"possible",reason:run.orderIds.length>1?`${run.orderIds.length} distinct order resources share the original business intent.`:"Only one order is currently observed."}],experiment:{title:"Read the original order",tool:"APIMatic OrdersController.ordersGetOrder",resourceId:orderId??"not-created",observedStatus:status,receiptId},conclusion:firstSucceeded?`The original order is completed with ${captureIds.length} capture resource. Retry must reconcile this purchase, not create another.`:"The outcome remains unresolved; do not infer failure or invent a replacement order.",model:"Deterministic reference diagnosis · no model call",source:"sample"};
    await this.store.updateRun(runId,item=>({...item,diagnosis}));return diagnosis;
  }
  async remediate(sessionId:string,runId:string){
    const run=await this.store.run(runId,sessionId);if(run.source!=="sample")throw new LabError("LIVE_REMEDIATION_GATE","Live compensation requires its separately reviewed exact capture authority.",409);if(run.remediation==="completed")return run;if(run.captureCount<2)throw new LabError("NO_DUPLICATE_CAPTURE","No duplicate completed capture is available for compensation.",409);
    const extra=run.captures.filter(capture=>["COMPLETED","PARTIALLY_REFUNDED"].includes(capture.status)).at(-1);if(!extra)throw new LabError("NO_REFUNDABLE_CAPTURE","No eligible duplicate capture is available.",409);
    const refunded=run.refunds.filter(refund=>refund.captureId===extra.id&&refund.status==="COMPLETED").reduce((sum,refund)=>sum+refund.amountMinor,0);const context={run,sessionId,store:this.store,transport:new LocalPayPalTransport(this.store,runId,noFaults)};
    await this.store.emit(runId,{lane:"lab",kind:"remediation_approved",title:"Approve compensation for the extra charge",detail:"This action authorizes one Sample refund against the duplicate capture. It does not erase either original charge.",resourceId:extra.id,facts:{amountMinor:extra.amountMinor-refunded,source:"sample"}});
    const operation=await fixtureCore(context).execute(fixtureCommand(context,{kind:"refund_capture",money:{currency:extra.currency,minor:extra.amountMinor-refunded},captureId:extra.id,orderId:extra.orderId},`remediation:${extra.id}`));
    await this.store.updateRun(runId,item=>({...item,remediation:operation.status==="succeeded"?"completed":"pending"}));await refreshRun(this.store,runId);return this.store.run(runId,sessionId);
  }
  async action(sessionId:string,runId:string,input:{action:"advance"|"diagnose"|"repair"|"verify"|"generate"|"verify_generated"|"remediate"|"cancel"|"cancel_work";requestId:string;candidate?:"grounded"|"deceptive";repairId?:string}){
    const run=await this.store.run(runId,sessionId);if(run.source!=="sample"&&!(["cancel","cancel_work"].includes(input.action)))throw new LabError("LIVE_ACTION_GATE","Use the browser-approved live experiment controls for this run.",409);const claim=await this.store.claimAction(sessionId,runId,input.requestId,input.action,{runId,...input});if(claim!=="claimed")return this.store.run(runId,sessionId);
    try{
      if(input.action==="generate"||input.action==="verify_generated") {await queueRepairJob(this.store,sessionId,run,input.requestId,input.action,input.repairId);return this.store.run(runId,sessionId);}
      if(input.action==="cancel_work"||input.action==="cancel")await this.store.db.transaction(async tx=>{
        await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE",[runId,sessionId]);
        await tx.query("UPDATE lab_actions SET stage='cancelled' WHERE session_id=$1 AND run_id=$2 AND action IN ('diagnose','repair','verify','generate','verify_generated') AND stage='running'",[sessionId,runId]);
        await tx.query("UPDATE lab_repair_jobs SET stage='cancelled',lease_until=NULL,error_code='WORK_CANCELLED' WHERE session_id=$1 AND run_id=$2 AND stage IN ('queued','running')",[sessionId,runId]);
      });
      if(input.action==="advance"){await this.store.queueRetry(runId,sessionId);await executeRun(this.store,runId,sessionId);}
      if(input.action==="diagnose")await modelDiagnosis(this.store,sessionId,run,new OpenAIModel(this.store,fetch,input.requestId));
      if(input.action==="repair")await proposeReferenceRepair(this.store,sessionId,run,input.candidate??"grounded");
      if(input.action==="verify"){
        const candidate=(await this.store.repairs(sessionId)).find(item=>item.runId===runId&&item.provenance==="human_reference"&&item.candidate==="grounded"&&item.status!=="rejected");if(!candidate)throw new LabError("REPAIR_REQUIRED","Propose a reference repair before verification.",409);
        const comparison=await campaignControlForRun(this.store,run,sessionId)??await this.startRun(sessionId,{projectId:run.projectId,scenarioId:run.scenarioId,revision:"hardened",mode:"sample",seed:run.seed,requestId:`verify:${input.requestId}`,interactive:false});
        await this.store.updateRun(runId,item=>({...item,comparisonRunId:comparison.id}));await this.store.updateRun(comparison.id,item=>({...item,comparisonRunId:runId}));await verifyReferenceRepair(this.store,sessionId,run,comparison);
      }
      if(input.action==="remediate")await this.remediate(sessionId,runId);
      if(input.action==="cancel"){
        await this.store.db.query("UPDATE lab_runs SET cancelled=1 WHERE id=$1 AND session_id=$2",[runId,sessionId]);await this.store.emit(runId,{lane:"lab",kind:"cancelled",title:"Experiment cancelled",detail:"The experiment authority is revoked. Existing provider resources and history remain visible.",facts:{noAutomaticCompensation:true}});const current=await refreshRun(this.store,runId,false);await this.store.updateRun(runId,item=>({...item,stage:current.phoneState==="checking"?"cancelled_uncertain":"cancelled_reconciled",nextAction:"Inspect retained evidence"}),"cancelled");await this.store.db.query("UPDATE lab_jobs SET stage='cancelled',lease_until=NULL WHERE run_id=$1",[runId]);
      }
      await this.store.finishAction(input.requestId,sessionId);return this.store.run(runId,sessionId);
    }catch(error){await this.store.finishAction(input.requestId,sessionId,"failed");throw error;}
  }
  async campaign(sessionId:string,input:{projectId:string;revision:"faulty"|"hardened";scenarioIds:string[];requestId:string}){
    const previous=await this.store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_campaigns WHERE session_id=$1 AND request_id=$2",[sessionId,input.requestId]);if(previous.rows[0])return JSON.parse(previous.rows[0].document) as CampaignDTO;
    const selected=[...new Set(input.scenarioIds)];if(!selected.length||selected.length>12)throw new LabError("CAMPAIGN_SIZE","Choose between one and twelve cases.");for(const id of selected){const scenario=scenarios.find(item=>item.id===id);if(!scenario?.available||!scenario.fixtureIds.includes(input.projectId))throw new LabError("CAMPAIGN_GATED",`Case ${id} is not qualified for this fixture.`,409);}
    const campaign:CampaignDTO={id:randomUUID(),projectId:input.projectId,title:`${input.revision==="faulty"?"Faulty baseline":"Hardened control"} · ${selected.length} cases`,createdAt:new Date().toISOString(),revision:input.revision,status:"running",caseIds:selected,runIds:[],results:[],counts:{pass:0,fail:0,inconclusive:0,blocked:0,not_applicable:0}};
    await this.store.db.query("INSERT INTO lab_campaigns(id,session_id,request_id,created_at,document) VALUES($1,$2,$3,$4,$5)",[campaign.id,sessionId,input.requestId,campaign.createdAt,JSON.stringify(campaign)]);
    for(const scenarioId of selected){const run=await this.startRun(sessionId,{projectId:input.projectId,scenarioId,revision:input.revision,mode:"sample",seed:`campaign:${campaign.id}`,requestId:`${campaign.id}:${scenarioId}`,interactive:false});campaign.runIds.push(run.id);campaign.results.push({scenarioId,runId:run.id,verdict:run.verdict,source:run.source});campaign.counts[run.verdict]++;await this.store.db.query("UPDATE lab_campaigns SET document=$2 WHERE id=$1",[campaign.id,JSON.stringify(campaign)]);}
    campaign.status="completed";await this.store.db.query("UPDATE lab_campaigns SET document=$2 WHERE id=$1",[campaign.id,JSON.stringify(campaign)]);return campaign;
  }
}
export async function getService(){return new LabService(new LabStore(await getDatabase()));}
