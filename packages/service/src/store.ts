import { randomUUID } from "node:crypto";
import { canonicalJson, redact, sha256 } from "@fracture/paypal-core";
import type { SqlConnection, SqlDatabase } from "@fracture/paypal-core";
import type { CampaignDTO, DiagnosisDTO, EvidenceDTO, KnowledgeProjection, RepairDTO, RunDTO, RunStage, TraceEventDTO } from "@fracture/contracts";
import type { EventInput, FixtureResource, LabSession, RunInput, RunRow, TargetState } from "./types";
import { LabError } from "./errors";

type DocumentRow={document:string}&Record<string,unknown>;
export class LabStore {
  constructor(readonly db:SqlDatabase){}
  async createSession(role:LabSession["role"]="judge"):Promise<LabSession>{
    const now=new Date();const session:LabSession={id:randomUUID(),createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+24*3600000).toISOString(),role,selectedRunId:null,seeded:false};
    await this.db.query("INSERT INTO lab_sessions(id,created_at,expires_at,role) VALUES($1,$2,$3,$4)",[session.id,session.createdAt,session.expiresAt,role]);return session;
  }
  async session(id:string):Promise<LabSession|null>{
    const result=await this.db.query<{id:string;created_at:string;expires_at:string;role:LabSession["role"];selected_run_id:string|null;seeded:number}&Record<string,unknown>>("SELECT * FROM lab_sessions WHERE id=$1",[id]);const value=result.rows[0];
    return value&&Date.parse(value.expires_at)>Date.now()?{id:value.id,createdAt:value.created_at,expiresAt:value.expires_at,role:value.role,selectedRunId:value.selected_run_id,seeded:Boolean(value.seeded)}:null;
  }
  async rateLimit(key:string,maximum:number,windowMs=3600000){
    const window=String(Math.floor(Date.now()/windowMs));
    const result=await this.db.query<{count:number}&Record<string,unknown>>("INSERT INTO lab_rate_windows(key,window_key,count) VALUES($1,$2,1) ON CONFLICT(key,window_key) DO UPDATE SET count=lab_rate_windows.count+1 RETURNING count",[key,window]);
    if((result.rows[0]?.count??maximum+1)>maximum)throw new LabError("RATE_LIMIT","This session has reached its request limit. Existing evidence remains available.",429);
  }
  async createRun(sessionId:string,input:RunInput,run:RunDTO){
    const inputHash=sha256(canonicalJson(input));
    return this.db.transaction(async tx=>{
      await tx.query("SELECT id FROM lab_sessions WHERE id=$1 FOR UPDATE",[sessionId]);
      const old=await tx.query<RunRow>("SELECT * FROM lab_runs WHERE session_id=$1 AND request_id=$2",[sessionId,input.requestId]);
      if(old.rows[0]){if(old.rows[0].input_hash!==inputHash)throw new LabError("RUN_PAYLOAD_CONFLICT","This request identity belongs to a different scenario.",409);return {created:false,run:JSON.parse(old.rows[0].document) as RunDTO};}
      const active=await tx.query("SELECT id FROM lab_runs WHERE session_id=$1 AND stage IN ('created','preflight','provisioning','executing','observing','evaluating','awaiting_approval')",[sessionId]);
      if(active.rowCount)throw new LabError("RUN_ALREADY_ACTIVE","Finish or cancel the active journey before starting another run.",409);
      await tx.query("INSERT INTO lab_runs(id,session_id,request_id,input_hash,project_id,stage,checkpoint,source,created_at,updated_at,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",[run.id,sessionId,input.requestId,inputHash,run.projectId,run.stage,"start",run.source,run.createdAt,run.updatedAt,JSON.stringify(run)]);
      await tx.query("INSERT INTO lab_jobs(id,session_id,run_id,kind,stage,available_at,document) VALUES($1,$2,$3,$4,$5,$6,$7)",[`execute:${run.id}`,sessionId,run.id,"run","queued",run.createdAt,JSON.stringify(input)]);
      await tx.query("UPDATE lab_sessions SET selected_run_id=$2 WHERE id=$1",[sessionId,run.id]);
      return {created:true,run};
    });
  }
  async record(runId:string,sessionId?:string,connection:SqlConnection=this.db):Promise<RunRow>{
    const result=await connection.query<RunRow>(`SELECT * FROM lab_runs WHERE id=$1${sessionId?" AND session_id=$2":""}`,[runId,...(sessionId?[sessionId]:[])]);
    if(!result.rows[0])throw new LabError("RUN_NOT_FOUND","The run is not in this session.",404);return result.rows[0];
  }
  async run(runId:string,sessionId?:string){return JSON.parse((await this.record(runId,sessionId)).document) as RunDTO;}
  async runs(sessionId:string){const result=await this.db.query<DocumentRow>("SELECT document FROM lab_runs WHERE session_id=$1 ORDER BY created_at DESC LIMIT 250",[sessionId]);return result.rows.map(row=>JSON.parse(row.document) as RunDTO);}
  async updateRun(runId:string,update:(run:RunDTO)=>RunDTO,checkpoint?:string){
    return this.db.transaction(async tx=>{
      const result=await tx.query<RunRow>("SELECT * FROM lab_runs WHERE id=$1 FOR UPDATE",[runId]);if(!result.rows[0])throw new LabError("RUN_NOT_FOUND","Run not found.",404);
      const row=result.rows[0];const next=update(JSON.parse(row.document) as RunDTO);next.updatedAt=new Date().toISOString();
      await tx.query("UPDATE lab_runs SET document=$2,stage=$3,updated_at=$4,version=version+1,checkpoint=$5 WHERE id=$1",[runId,JSON.stringify(next),next.stage,next.updatedAt,checkpoint??row.checkpoint]);return next;
    });
  }
  async stage(runId:string,stage:RunStage,checkpoint?:string){return this.updateRun(runId,run=>({...run,stage}),checkpoint);}
  async resources(runId:string,connection:SqlConnection=this.db):Promise<FixtureResource[]>{const result=await connection.query<DocumentRow>("SELECT document FROM lab_provider_resources WHERE run_id=$1 ORDER BY id",[runId]);return result.rows.map(row=>JSON.parse(row.document) as FixtureResource);}
  async targetState(runId:string,intentId:string,connection:SqlConnection=this.db):Promise<TargetState>{
    const result=await connection.query<DocumentRow>("SELECT document FROM lab_target_state WHERE run_id=$1 AND intent_id=$2",[runId,intentId]);
    return result.rows[0]?JSON.parse(result.rows[0].document) as TargetState:{intentId,orderIds:[],status:"unpaid",lastCaptureId:null,attempt:0,fulfillmentCount:0,unknown:false};
  }
  async setTargetState(runId:string,state:TargetState,connection:SqlConnection=this.db){await connection.query("INSERT INTO lab_target_state(run_id,intent_id,document) VALUES($1,$2,$3) ON CONFLICT(run_id,intent_id) DO UPDATE SET document=$3",[runId,state.intentId,JSON.stringify(state)]);}
  async projection(run:RunDTO,connection:SqlConnection=this.db):Promise<KnowledgeProjection>{
    const resources=await this.resources(run.id,connection);const state=await this.targetState(run.id,run.businessIntentId,connection);
    const captures=resources.filter(resource=>resource.kind==="capture"&&["COMPLETED","REFUNDED","PARTIALLY_REFUNDED"].includes(resource.status));
    const refunds=resources.filter(resource=>resource.kind==="refund"&&resource.status==="COMPLETED");
    const fulfillments=await connection.query("SELECT id FROM lab_fulfillments WHERE run_id=$1 AND intent_id=$2",[run.id,run.businessIntentId]);
    return {phoneState:state.status==="unpaid"?"ready":state.status,applicationStatus:state.status.toUpperCase(),providerStatus:refunds.length?"REFUND COMPLETED":captures.length?"CAPTURE COMPLETED":resources.some(resource=>resource.status==="PENDING")?"CAPTURE PENDING":resources.some(resource=>resource.approved)?"ORDER APPROVED":resources.length?"ORDER CREATED":"NO PAYMENT",capturedMinor:captures.reduce((sum,item)=>sum+(item.money?.minor??0),0),refundedMinor:refunds.reduce((sum,item)=>sum+(item.money?.minor??0),0),captureCount:captures.length,fulfillmentCount:fulfillments.rowCount,currency:run.currency};
  }
  async emit(runId:string,input:EventInput):Promise<TraceEventDTO>{
    return this.db.transaction(async tx=>{
      const result=await tx.query<RunRow>("SELECT * FROM lab_runs WHERE id=$1 FOR UPDATE",[runId]);const row=result.rows[0];if(!row)throw new LabError("RUN_NOT_FOUND","Run not found.",404);
      const run=JSON.parse(row.document) as RunDTO;const timestamp=new Date().toISOString();const sequence=run.events.length+1;const evidenceId=randomUUID();
      const event:TraceEventDTO={id:randomUUID(),runId,sequence,logicalClock:sequence,timestamp,offsetMs:Math.max(0,Date.parse(timestamp)-Date.parse(run.createdAt)),lane:input.lane,kind:input.kind,title:input.title,detail:input.detail,source:run.source,evidenceIds:[evidenceId],identity:input.identity??"not_applicable",projection:{...await this.projection(run,tx),...input.projection},...(input.resourceId?{resourceId:input.resourceId}:{}),...(input.requestId?{requestId:input.requestId}:{}),...(input.sourceRef?{sourceRef:input.sourceRef}:{})};
      const body=redact({eventId:event.id,sequence,logicalClock:sequence,kind:input.kind,lane:input.lane,resourceId:input.resourceId??null,providerRequestId:input.requestId??null,identity:event.identity,projection:event.projection,facts:input.facts??{}}) as Record<string,unknown>;
      const evidence:EvidenceDTO={id:evidenceId,runId,title:input.title,kind:input.lane==="provider"?"resource":"trace",source:run.source,createdAt:timestamp,sha256:sha256(canonicalJson(body)),summary:input.detail,body,redactions:["Authorization and cookie headers are excluded.","Raw credentials and customer contact details are never recorded."],...(input.sourceRef?{sourceRef:input.sourceRef}:{})};
      run.events.push(event);Object.assign(run,event.projection);run.updatedAt=timestamp;
      await tx.query("INSERT INTO lab_events(id,run_id,sequence,document) VALUES($1,$2,$3,$4)",[event.id,runId,sequence,JSON.stringify(event)]);
      await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5)",[evidence.id,row.session_id,runId,timestamp,JSON.stringify(evidence)]);
      await tx.query("UPDATE lab_runs SET document=$2,updated_at=$3,version=version+1 WHERE id=$1",[runId,JSON.stringify(run),timestamp]);return event;
    });
  }
  async evidence(sessionId:string){const result=await this.db.query<DocumentRow>("SELECT document FROM lab_evidence WHERE session_id=$1 ORDER BY created_at DESC LIMIT 5000",[sessionId]);return result.rows.map(row=>JSON.parse(row.document) as EvidenceDTO);}
  async addEvidence(sessionId:string,evidence:EvidenceDTO){await this.db.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",[evidence.id,sessionId,evidence.runId,evidence.createdAt,JSON.stringify(evidence)]);}
  async repairs(sessionId:string){const result=await this.db.query<DocumentRow>("SELECT document FROM lab_repairs WHERE session_id=$1 ORDER BY id",[sessionId]);return result.rows.map(row=>JSON.parse(row.document) as RepairDTO);}
  async saveRepair(sessionId:string,repair:RepairDTO){await this.db.query("INSERT INTO lab_repairs(id,session_id,run_id,document) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET document=$4",[repair.id,sessionId,repair.runId,JSON.stringify(repair)]);}
  async campaigns(sessionId:string){const result=await this.db.query<DocumentRow>("SELECT document FROM lab_campaigns WHERE session_id=$1 ORDER BY created_at DESC",[sessionId]);return result.rows.map(row=>JSON.parse(row.document) as CampaignDTO);}
  async claimJob(runId:string,owner:string){
    return this.db.transaction(async tx=>{
      await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");
      const result=await tx.query<{stage:string;lease_until:string|null;document:string}&Record<string,unknown>>("SELECT stage,lease_until,document FROM lab_jobs WHERE id=$1 FOR UPDATE",[`execute:${runId}`]);const job=result.rows[0];if(!job)return null;
      const now=new Date().toISOString();if(!["queued","running"].includes(job.stage)||job.stage==="running"&&job.lease_until&&job.lease_until>now)return null;
      const active=await tx.query("SELECT id FROM lab_jobs WHERE stage='running' AND lease_until>$1",[now]);if(active.rowCount>=3)throw new LabError("WORKER_CAPACITY","Three experiments are already running. Retry shortly.",429);
      await tx.query("UPDATE lab_jobs SET stage='running',lease_owner=$2,lease_until=$3,attempts=attempts+1 WHERE id=$1",[`execute:${runId}`,owner,new Date(Date.now()+120000).toISOString()]);
      return {input:JSON.parse(job.document) as RunInput,recovering:job.stage==="running"};
    });
  }
  async finishJob(runId:string,owner:string,stage="completed"){await this.db.query("UPDATE lab_jobs SET stage=$3,lease_until=NULL WHERE id=$1 AND lease_owner=$2",[`execute:${runId}`,owner,stage]);}
  async claimAuxiliaryJob(id:string,sessionId:string,runId:string|null,kind:string,document:unknown){await this.db.transaction(async tx=>{
    await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");const now=new Date().toISOString();const active=await tx.query("SELECT id FROM lab_jobs WHERE stage='running' AND lease_until>$1",[now]);if(active.rowCount>=3)throw new LabError("WORKER_CAPACITY","Three experiments are already running. Retry shortly.",429);
    await tx.query("INSERT INTO lab_jobs(id,session_id,run_id,kind,stage,available_at,lease_owner,lease_until,attempts,document) VALUES($1,$2,$3,$4,'running',$5,$1,$6,1,$7)",[id,sessionId,runId,kind,now,new Date(Date.now()+120000).toISOString(),JSON.stringify(document)]);
  });}
  async finishAuxiliaryJob(id:string,stage:string){await this.db.query("UPDATE lab_jobs SET stage=$2,lease_until=NULL WHERE id=$1",[id,stage]);}
  async queueRetry(runId:string,sessionId:string){await this.db.transaction(async tx=>{
    const result=await tx.query<RunRow>("SELECT * FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE",[runId,sessionId]);const row=result.rows[0];if(!row)throw new LabError("RUN_NOT_FOUND","Run not found.",404);
    if(row.checkpoint!=="awaiting_retry")throw new LabError("NO_RETRY_AVAILABLE","This journey has no pending customer retry.",409);
    await tx.query("UPDATE lab_runs SET checkpoint='retry_queued' WHERE id=$1",[runId]);await tx.query("UPDATE lab_jobs SET stage='queued',lease_owner=NULL,lease_until=NULL WHERE id=$1",[`execute:${runId}`]);
  });}
  async claimAction(sessionId:string,runId:string,requestId:string,action:string,input:unknown){
    const hash=sha256(canonicalJson(input));return this.db.transaction(async tx=>{
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE",[runId,sessionId]);await this.record(runId,sessionId,tx);
      const prior=await tx.query<{stage:string;input_hash:string}&Record<string,unknown>>("SELECT stage,input_hash FROM lab_actions WHERE id=$1 AND session_id=$2",[requestId,sessionId]);
      if(prior.rows[0]){if(prior.rows[0].input_hash!==hash)throw new LabError("ACTION_CONFLICT","This request identity belongs to a different action.",409);return prior.rows[0].stage;}
      const running=await tx.query("SELECT id FROM lab_actions WHERE run_id=$1 AND stage='running'",[runId]);if(running.rowCount&&action!=="cancel"&&action!=="cancel_work")throw new LabError("ACTION_IN_PROGRESS","Another action is executing for this run.",409);
      await tx.query("INSERT INTO lab_actions(id,session_id,run_id,action,input_hash,stage,created_at) VALUES($1,$2,$3,$4,$5,'running',$6)",[requestId,sessionId,runId,action,hash,new Date().toISOString()]);return "claimed";
    });
  }
  async finishAction(requestId:string,sessionId:string,stage="completed"){await this.db.query("UPDATE lab_actions SET stage=$3 WHERE id=$1 AND session_id=$2 AND stage='running'",[requestId,sessionId,stage]);}
  async completeDiagnosis(sessionId:string,runId:string,diagnosis:DiagnosisDTO,actionId?:string){return this.db.transaction(async tx=>{
    const result=await tx.query<RunRow>("SELECT * FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE",[runId,sessionId]);const row=result.rows[0];if(!row)throw new LabError("RUN_NOT_FOUND","Run not found.",404);
    if(actionId){const action=await tx.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE",[actionId,sessionId]);if(action.rows[0]?.stage!=="running")throw new LabError("WORK_CANCELLED","The investigation was cancelled before its conclusion was applied.",409);}
    const run=JSON.parse(row.document) as RunDTO;run.diagnosis=diagnosis;run.updatedAt=new Date().toISOString();await tx.query("UPDATE lab_runs SET document=$2,updated_at=$3,version=version+1 WHERE id=$1",[runId,JSON.stringify(run),run.updatedAt]);if(actionId)await tx.query("UPDATE lab_actions SET stage='completed' WHERE id=$1 AND session_id=$2",[actionId,sessionId]);return diagnosis;
  });}
}
