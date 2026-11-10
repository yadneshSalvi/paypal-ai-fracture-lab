import { randomUUID } from "node:crypto";
import { canonicalJson,sha256 } from "@fracture/paypal-core";
import type { EvidenceDTO } from "@fracture/contracts";
import { requiredConfig } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import { LabStore } from "../../service/src/store";

export interface ModelOutput {type:string;name?:string;arguments?:string;call_id?:string;content?:{type:string;text?:string;refusal?:string}[]}
export interface ModelResponse {id:string;model:string;status:string;output:ModelOutput[];usage?:Record<string,unknown>;incomplete_details?:unknown}
export interface ModelCall {role:string;model:string;instructions:string;input:unknown;schema?:Record<string,unknown>;tools?:Record<string,unknown>[];toolName?:string;maximumOutputTokens?:number;reasoningEffort?:string}
export interface ModelReceipt {attemptId:string;evidenceId:string;response:ModelResponse;durationMs:number;inputHash:string}

/** Server-side only. Call data is persisted before dispatch; auth headers never enter the record. */
export class OpenAIModel {
  constructor(private store:LabStore,private fetchImpl:typeof fetch=fetch,readonly actionId?:string){}
  async assertActive(sessionId:string){if(!this.actionId)return;const result=await this.store.db.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2",[this.actionId,sessionId]);if(result.rows[0]?.stage!=="running")throw new LabError("WORK_CANCELLED","The model investigation was cancelled. Existing evidence is preserved.",409);}
  async call(sessionId:string,runId:string|null,call:ModelCall):Promise<ModelReceipt>{
    await this.assertActive(sessionId);
    const key=requiredConfig("OPENAI_API_KEY");const attemptId=randomUUID();const started=Date.now();const inputHash=sha256(canonicalJson({instructions:call.instructions,input:call.input,schema:call.schema??null,tools:call.tools??null,model:call.model}));
    const request={model:call.model,store:false,reasoning:{effort:call.reasoningEffort??process.env.OPENAI_REASONING_EFFORT??"max"},max_output_tokens:call.maximumOutputTokens??6144,input:[{role:"developer",content:call.instructions},{role:"user",content:JSON.stringify(call.input)}],...(call.schema?{text:{format:{type:"json_schema",name:call.role.replaceAll(/[^a-zA-Z0-9_]/g,"_"),strict:true,schema:call.schema}}}:{}),...(call.tools?{tools:call.tools,parallel_tool_calls:false,tool_choice:call.toolName?{type:"function",name:call.toolName}:"auto"}:{})};
    const record={attemptId,actionId:this.actionId??null,role:call.role,model:call.model,inputHash,startedAt:new Date(started).toISOString(),request,status:"running",source:"model_generation"};
    await this.store.db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,$4,'running',$5)",[attemptId,sessionId,runId,call.role,JSON.stringify(record)]);
    const cancel=new AbortController();const timer=this.actionId?setInterval(()=>{void this.assertActive(sessionId).catch(()=>cancel.abort());},1500):null;
    let observedResponse:ModelResponse|null=null;let jobStatus="failed";
    try{
      await this.store.claimAuxiliaryJob(`model:${attemptId}`,sessionId,runId,"model",{attemptId,actionId:this.actionId??null,role:call.role,model:call.model,inputHash});
      const result=await this.fetchImpl("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(request),signal:AbortSignal.any([AbortSignal.timeout(90000),cancel.signal])});
      await this.assertActive(sessionId);
      if(!result.ok)throw new LabError(`MODEL_HTTP_${result.status}`,"The model provider refused or could not complete this request. The attempt is retained without an invented result.",502);
      const response=await result.json() as ModelResponse;observedResponse={...response,output:Array.isArray(response.output)?response.output.filter(item=>item.type==="message"||item.type==="function_call"):[]};if(response.status!=="completed"||!Array.isArray(response.output))throw new LabError("MODEL_INCOMPLETE","The model did not return a completed response. No diagnosis or repair is inferred.",502);
      if(response.output.some(item=>item.content?.some(part=>part.type==="refusal")))throw new LabError("MODEL_REFUSAL","The model declined this request. The attempt is retained.",422);
      const safeResponse=observedResponse;const durationMs=Date.now()-started;const complete={...record,status:"completed",response:safeResponse,durationMs,completedAt:new Date().toISOString()};jobStatus="completed";
      await this.store.db.query("UPDATE lab_model_attempts SET status='completed',document=$2 WHERE id=$1",[attemptId,JSON.stringify(complete)]);
      const body={attemptId,role:call.role,model:response.model,inputHash,requestHash:sha256(canonicalJson(request)),response:safeResponse,durationMs,provenance:"model_generated",provider:"OpenAI Responses API",reasoningEffort:request.reasoning.effort};const evidence:EvidenceDTO={id:randomUUID(),runId,title:`Model receipt · ${call.role}`,kind:"receipt",source:"sample",createdAt:new Date().toISOString(),sha256:sha256(canonicalJson(body)),summary:"An actual model call using redacted Sample evidence. This is model output, not a provider payment observation.",body,redactions:["Authorization headers and API keys are excluded.","Private reasoning and encrypted reasoning content are not published."]};await this.store.addEvidence(sessionId,evidence);return {attemptId,evidenceId:evidence.id,response:safeResponse,durationMs,inputHash};
    }catch(error){const code=cancel.signal.aborted?"WORK_CANCELLED":error instanceof LabError?error.code:error instanceof Error&&error.name==="TimeoutError"?"MODEL_TIMEOUT":"MODEL_TRANSPORT_FAILURE";const status=code==="WORK_CANCELLED"?"cancelled":"failed";jobStatus=status;await this.store.db.query("UPDATE lab_model_attempts SET status=$3,document=$2 WHERE id=$1",[attemptId,JSON.stringify({...record,status,durationMs:Date.now()-started,errorCode:code,providerResponse:observedResponse}),status]);if(code==="WORK_CANCELLED")throw new LabError(code,"The model investigation was cancelled. Existing evidence is preserved.",409);if(error instanceof LabError)throw error;throw new LabError(code,"The model call did not complete. Its failed attempt is saved; no fallback output is presented as a model result.",502);}finally{if(timer)clearInterval(timer);await this.store.finishAuxiliaryJob(`model:${attemptId}`,jobStatus);}
  }
}
export function outputJson(response:ModelResponse):unknown{
  const text=response.output.filter(item=>item.type==="message").flatMap(item=>item.content??[]).filter(item=>item.type==="output_text").map(item=>item.text??"").join("");if(!text||text.length>100000)throw new LabError("MODEL_SCHEMA","The model did not return a bounded structured answer.",502);try{return JSON.parse(text);}catch{throw new LabError("MODEL_SCHEMA","The model's structured answer could not be parsed.",502);}
}
export const strictObject=(properties:Record<string,unknown>)=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
