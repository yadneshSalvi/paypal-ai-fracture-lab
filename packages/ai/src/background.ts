import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { EvidenceDTO } from "@fracture/contracts";
import { requiredConfig } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import { LabStore } from "../../service/src/store";
import { OpenAIModel, publicModelResponse } from "./model";
import type { ModelCall, ModelReceipt, ModelResponse } from "./model";
import { fetchModelProvider, modelTransportReceipt, type ModelTransportReceipt } from "./transport";

/** A checkpoint, not a failure. The caller releases its lease before waiting. */
export class ModelPending extends Error { constructor(){super("The saved provider response is still running.");} }
interface Checkpoint {
  attemptId:string; actionId:string; sessionId:string; runId:string|null; role:string;
  inputHash:string; requestHash:string; startedAt:string; model:string;
  stage:"dispatching"|"polling"|"completed"|"failed"; responseId?:string;
  errorCode?:string; receipt?:ModelReceipt; pollAfter?:number; providerResponse?:ModelResponse;
  cancelPending?:boolean; providerFinalStatus?:string;
  transports?:ModelTransportReceipt[];
}
const safeResponse=(value:ModelResponse):ModelResponse=>publicModelResponse({...value,output:Array.isArray(value.output)?value.output:[]});
const responseIdentity=(value:ModelResponse)=>typeof value.id==="string"&&/^resp_[A-Za-z0-9_-]+$/.test(value.id)&&["queued","in_progress","completed","incomplete","failed","cancelled"].includes(value.status);

/** One provider create per action/role. A fresh worker only polls the retained response. */
export class BackgroundRepairModel {
  private authority:OpenAIModel;
  constructor(private store:LabStore,private actionId:string,private fetchImpl:typeof fetch=fetchModelProvider,private signal?:AbortSignal){if(fetchImpl===globalThis.fetch)this.fetchImpl=fetchModelProvider;this.authority=new OpenAIModel(store,this.fetchImpl,actionId,signal);}
  assertActive(sessionId:string){return this.authority.assertActive(sessionId);}
  async call(sessionId:string,runId:string|null,call:ModelCall):Promise<ModelReceipt>{
    await this.assertActive(sessionId);
    if(call.continuation)throw new LabError("MODEL_BACKGROUND_CONTINUATION","Tool continuations use the encrypted stateless response adapter.",422);
    const id=`${sessionId}:${this.actionId}:${call.role}`;
    const request={model:call.model,background:true,store:false,stream:false,reasoning:{effort:call.reasoningEffort??process.env.OPENAI_REASONING_EFFORT??"max"},max_output_tokens:call.maximumOutputTokens??6144,input:[{role:"developer",content:call.instructions},{role:"user",content:JSON.stringify(call.input)}],...(call.schema?{text:{format:{type:"json_schema",name:call.role.replaceAll(/[^a-zA-Z0-9_]/g,"_"),strict:true,schema:call.schema}}}:{}),...(call.tools?{tools:call.tools,parallel_tool_calls:false,tool_choice:call.toolName?{type:"function",name:call.toolName}:"auto"}:{})};
    const inputHash=sha256(canonicalJson({instructions:call.instructions,input:call.input,schema:call.schema??null,tools:call.tools??null,model:call.model}));
    const requestHash=sha256(canonicalJson(request));
    const initial:Checkpoint={attemptId:randomUUID(),actionId:this.actionId,sessionId,runId,role:call.role,inputHash,requestHash,startedAt:new Date().toISOString(),model:call.model,stage:"dispatching"};
    const inserted=await this.store.db.query("INSERT INTO lab_background_models(id,session_id,action_id,document) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING",[id,sessionId,this.actionId,JSON.stringify(initial)]);
    const row=(await this.store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_background_models WHERE id=$1",[id])).rows[0];
    if(!row)throw new LabError("MODEL_CHECKPOINT_MISSING","The model checkpoint could not be read.",503);
    let checkpoint=JSON.parse(row.document) as Checkpoint;
    if(checkpoint.inputHash!==inputHash||checkpoint.requestHash!==requestHash||checkpoint.sessionId!==sessionId||checkpoint.actionId!==this.actionId||checkpoint.runId!==runId)throw new LabError("MODEL_CHECKPOINT_CONFLICT","This action belongs to different model input.",409);
    if(checkpoint.stage==="completed"&&checkpoint.receipt){await this.assertActive(sessionId);return checkpoint.receipt;}
    if(checkpoint.stage==="failed")throw new LabError(checkpoint.errorCode??"MODEL_FAILED","The retained model attempt failed; it is not dispatched again.",502);
    if(inserted.rowCount!==1&&checkpoint.stage==="dispatching")throw new LabError("MODEL_DISPATCH_UNKNOWN","The first provider submission has no recorded response identity. No duplicate model request was sent.",503);
    if(checkpoint.pollAfter&&checkpoint.pollAfter>Date.now())throw new ModelPending();
    const key=requiredConfig("OPENAI_API_KEY");
    const save=async()=>{await this.store.db.query("UPDATE lab_background_models SET document=$2 WHERE id=$1",[id,JSON.stringify(checkpoint)]);};
    const persistAttempt=async(status:string,extra:Record<string,unknown>={})=>{await this.store.db.query("UPDATE lab_model_attempts SET status=$2,document=$3 WHERE id=$1",[checkpoint.attemptId,status,JSON.stringify({...checkpoint,status,...extra})]);};
    const retainTransport=(value:unknown)=>{
      const receipt=modelTransportReceipt(value);if(!receipt)return;
      const previous=checkpoint.transports??[];
      const index=previous.findIndex(item=>item.startedAt===receipt.startedAt&&item.endpoint===receipt.endpoint&&item.method===receipt.method);
      checkpoint.transports=index<0?[...previous,receipt]:previous.map((item,i)=>i===index?receipt:item);
    };
    let providerResult:Response|null=null;
    try{
      if(inserted.rowCount===1)await this.store.db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,$4,'running',$5)",[checkpoint.attemptId,sessionId,runId,call.role,JSON.stringify({...checkpoint,request,status:"running",source:"model_generation"})]);
      const isCreate=checkpoint.stage==="dispatching";
      const response=await this.fetchImpl(isCreate?"https://api.openai.com/v1/responses":`https://api.openai.com/v1/responses/${checkpoint.responseId}`,{method:isCreate?"POST":"GET",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},...(isCreate?{body:JSON.stringify(request)}:{}),signal:AbortSignal.any([AbortSignal.timeout(30000),...(this.signal?[this.signal]:[])])});
      providerResult=response;
      if(!response.ok){
        await response.arrayBuffer().catch(()=>{});retainTransport(response);
        if(!isCreate&&(response.status===429||response.status>=500)){checkpoint.pollAfter=Date.now()+15000;await save();throw new ModelPending();}
        throw new LabError(`MODEL_HTTP_${response.status}`,"The provider did not return a usable model response.",502);
      }
      const value=await response.json() as ModelResponse;
      retainTransport(response);
      if(!responseIdentity(value)||(checkpoint.responseId&&checkpoint.responseId!==value.id))throw new LabError("MODEL_RESPONSE_IDENTITY","The response does not match the saved provider identity.",502);
      checkpoint={...checkpoint,responseId:value.id,stage:"polling",pollAfter:Date.now()+10000};await save();
      await this.assertActive(sessionId);
      if(value.status==="queued"||value.status==="in_progress"){
        if(Date.now()-Date.parse(checkpoint.startedAt)>3600000)throw new LabError("MODEL_TIMEOUT","The background model exceeded its one-hour execution limit.",504);
        await persistAttempt("running",{providerStatus:value.status});throw new ModelPending();
      }
      const observed=safeResponse(value);
      if(value.status!=="completed"){
        checkpoint.providerResponse=observed;
        await persistAttempt("failed",{providerResponse:observed});
        throw new LabError("MODEL_INCOMPLETE","The provider returned a terminal result without a completed answer.",502);
      }
      if(observed.output.some(item=>item.content?.some(part=>part.type==="refusal")))throw new LabError("MODEL_REFUSAL","The model declined the repair request.",422);
      const durationMs=Date.now()-Date.parse(checkpoint.startedAt);
      const body={attemptId:checkpoint.attemptId,role:call.role,model:value.model,inputHash,requestHash,response:observed,transports:checkpoint.transports??[],durationMs,provenance:"model_generated",provider:"OpenAI Responses API",reasoningEffort:request.reasoning.effort,background:true};
      const evidence:EvidenceDTO={id:checkpoint.attemptId,runId,title:`Model receipt · ${call.role}`,kind:"receipt",source:"sample",createdAt:new Date().toISOString(),sha256:sha256(canonicalJson(body)),summary:"An actual background model response using allowlisted Sample context. This is not a payment observation.",body,redactions:["API credentials and private reasoning are excluded.","Provider background polling temporarily stores the response with store:false."]};
      const receipt:ModelReceipt={attemptId:checkpoint.attemptId,evidenceId:evidence.id,response:observed,durationMs,inputHash};
      checkpoint={...checkpoint,stage:"completed",receipt};
      await this.store.db.transaction(async tx=>{
        const action=(await tx.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE",[this.actionId,sessionId])).rows[0];
        if(action?.stage!=="running")throw new LabError("WORK_CANCELLED","The repair action is no longer active.",409);
        await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING",[evidence.id,sessionId,runId,evidence.createdAt,JSON.stringify(evidence)]);
        await tx.query("UPDATE lab_model_attempts SET status='completed',document=$2 WHERE id=$1",[checkpoint.attemptId,JSON.stringify({...checkpoint,status:"completed",response:observed,durationMs})]);
        await tx.query("UPDATE lab_background_models SET document=$2 WHERE id=$1",[id,JSON.stringify(checkpoint)]);
      });
      return receipt;
    }catch(error){
      retainTransport(error);retainTransport(providerResult);
      if(error instanceof ModelPending)throw error;
      // A read is safe to retry. A create without a returned identity is never replayed.
      if(checkpoint.responseId&&!(error instanceof LabError)&&!this.signal?.aborted){checkpoint.pollAfter=Date.now()+15000;await save();throw new ModelPending();}
      const code=this.signal?.aborted?"WORK_CANCELLED":error instanceof LabError?error.code:checkpoint.responseId?"MODEL_TRANSPORT_FAILURE":"MODEL_DISPATCH_UNKNOWN";
      if(checkpoint.responseId&&(code==="WORK_CANCELLED"||code==="MODEL_TIMEOUT")){
        checkpoint.cancelPending=true;await save();
        try{const cancelled=await this.fetchImpl(`https://api.openai.com/v1/responses/${checkpoint.responseId}/cancel`,{method:"POST",headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});if(cancelled.ok){const final=await cancelled.json() as ModelResponse;if(responseIdentity(final)&&final.id===checkpoint.responseId&&!["queued","in_progress"].includes(final.status)){checkpoint.cancelPending=false;checkpoint.providerFinalStatus=final.status;}}}catch{/* Cleanup retains this exact response for an idempotent retry. */}
      }
      checkpoint={...checkpoint,stage:"failed",errorCode:code};await save();await persistAttempt(code==="WORK_CANCELLED"?"cancelled":"failed",{errorCode:code});
      throw new LabError(code,"The retained background attempt did not complete. No replacement request was sent.",502);
    }finally{await providerResult?.body?.cancel().catch(()=>{});}
  }
}

/** Cancellation is sent to the original provider response, including between workflow polls. */
export async function cancelInactiveBackgroundModels(store:LabStore,fetchImpl:typeof fetch=fetchModelProvider){
  const rows=await store.db.query<{id:string;document:string}&Record<string,unknown>>("SELECT b.id,b.document FROM lab_background_models b JOIN lab_actions a ON a.id=b.action_id AND a.session_id=b.session_id WHERE a.stage IN ('cancelled','failed') AND (b.document LIKE '%\"stage\":\"polling\"%' OR b.document LIKE '%\"cancelPending\":true%') ORDER BY b.id LIMIT 8");
  await Promise.all(rows.rows.map(async row=>{
    const checkpoint=JSON.parse(row.document) as Checkpoint;
    if((checkpoint.stage!=="polling"&&!checkpoint.cancelPending)||!checkpoint.responseId)return;
    try{
      const response=await fetchImpl(`https://api.openai.com/v1/responses/${checkpoint.responseId}/cancel`,{method:"POST",headers:{authorization:`Bearer ${requiredConfig("OPENAI_API_KEY")}`},signal:AbortSignal.timeout(10000)});
      if(!response.ok)return;
      const value=await response.json() as ModelResponse;
      if(!responseIdentity(value)||value.id!==checkpoint.responseId||["queued","in_progress"].includes(value.status))return;
      const next={...checkpoint,stage:"failed",errorCode:checkpoint.errorCode??"WORK_CANCELLED",cancelPending:false,providerFinalStatus:value.status};
      await store.db.query("UPDATE lab_background_models SET document=$2 WHERE id=$1",[row.id,JSON.stringify(next)]);
      await store.db.query("UPDATE lab_model_attempts SET status='cancelled',document=$2 WHERE id=$1",[checkpoint.attemptId,JSON.stringify(next)]);
    }catch{/* Keep polling identity so a later cleanup can retry this idempotent cancellation. */}
  }));
}
