import { randomUUID } from "node:crypto";
import { canonicalJson,sha256 } from "@fracture/paypal-core";
import type { EvidenceDTO } from "@fracture/contracts";
import { requiredConfig } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import { LabStore } from "../../service/src/store";
import { fetchModelProvider, modelTransportReceipt, ModelTransportError } from "./transport";
import { ModelContextVault, type ToolContinuation } from "./context-vault";

export interface ModelOutput extends Record<string,unknown> {type:string;name?:string;arguments?:string;call_id?:string;content?:{type:string;text?:string;refusal?:string}[]}
export interface ModelResponse {id:string;model:string;status:string;output:ModelOutput[];usage?:Record<string,unknown>;incomplete_details?:unknown}
export interface ModelCall {role:string;model:string;instructions:string;input:unknown;schema?:Record<string,unknown>;tools?:Record<string,unknown>[];toolName?:string;maximumOutputTokens?:number;reasoningEffort?:string;timeoutMs?:number;continuation?:ToolContinuation}
export interface ModelReceipt {attemptId:string;evidenceId:string;response:ModelResponse;durationMs:number;inputHash:string}

/** Only a provider terminal event is an answer. Private deltas never become public output. */
export async function readModelResponse(result: Response): Promise<ModelResponse> {
  if (!result.headers.get("content-type")?.includes("text/event-stream")) return await result.json() as ModelResponse;
  if (!result.body) throw new LabError("MODEL_STREAM_INTERRUPTED", "The model stream ended without a completed response.", 502);
  const reader = result.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = 0;
  const eventResponse = (frame: string): ModelResponse | null => {
    const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!data || data === "[DONE]") return null;
    let event: { type?: string; response?: ModelResponse };
    try { event = JSON.parse(data); } catch { throw new LabError("MODEL_STREAM_INVALID", "The model returned a malformed stream event.", 502); }
    if (event.type === "error") throw new LabError("MODEL_STREAM_ERROR", "The provider reported a stream error. No partial answer is accepted.", 502);
    if (!["response.completed", "response.incomplete", "response.failed"].includes(event.type ?? "")) return null;
    if (!event.response || typeof event.response.id !== "string" || event.response.status !== event.type!.slice(9)) throw new LabError("MODEL_STREAM_INVALID", "The terminal event did not contain a matching response.", 502);
    return event.response;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) received += value.byteLength;
      buffer += decoder.decode(value, { stream: !done });
      if (received > 8_000_000 || buffer.length > 1_000_000) throw new LabError("MODEL_STREAM_LIMIT", "The model stream exceeded its bounded response size.", 502);
      let separator: RegExpExecArray | null;
      while ((separator = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const response = eventResponse(frame);
        if (response) return response;
      }
      if (done) break;
    }
    throw new LabError("MODEL_STREAM_INTERRUPTED", "The model stream ended without a terminal response. Partial output is not a candidate.", 502);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function publicModelResponse(response: ModelResponse): ModelResponse {
  const output: ModelOutput[] = response.output.flatMap(item => {
    if (item.type === "function_call") return [{ type: item.type, ...(typeof item.name === "string" ? { name: item.name } : {}), ...(typeof item.arguments === "string" ? { arguments: item.arguments } : {}), ...(typeof item.call_id === "string" ? { call_id: item.call_id } : {}) }];
    if (item.type !== "message") return [];
    return [{ type: item.type, content: (item.content ?? []).flatMap<NonNullable<ModelOutput["content"]>[number]>(part => part.type === "output_text" && typeof part.text === "string" ? [{ type: part.type, text: part.text }] : part.type === "refusal" && typeof part.refusal === "string" ? [{ type: part.type, refusal: part.refusal }] : []) }];
  });
  return { id: response.id, model: response.model, status: response.status, output, ...(response.usage ? { usage: response.usage } : {}), ...(response.incomplete_details ? { incomplete_details: response.incomplete_details } : {}) };
}

export function modelAttemptIdentity(sessionId: string, actionId: string, role: string) {
  const hash = sha256(canonicalJson({ sessionId, actionId, role }));
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

/** Server-side only. Call data is persisted before dispatch; auth headers never enter the record. */
export class OpenAIModel {
  constructor(private store:LabStore,private fetchImpl:typeof fetch=fetchModelProvider,readonly actionId?:string,readonly signal?:AbortSignal){
    // Existing product callers explicitly pass the platform fetch. They still use
    // the qualified provider transport; an injected test transport stays scoped.
    if(fetchImpl===globalThis.fetch)this.fetchImpl=fetchModelProvider;
  }
  async assertActive(sessionId:string){if(this.signal?.aborted)throw new LabError("WORK_CANCELLED","The model job lost execution authority.",409);if(!this.actionId)return;const result=await this.store.db.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2",[this.actionId,sessionId]);if(result.rows[0]?.stage!=="running")throw new LabError("WORK_CANCELLED","The model investigation was cancelled. Existing evidence is preserved.",409);}
  async call(sessionId:string,runId:string|null,call:ModelCall):Promise<ModelReceipt>{
    await this.assertActive(sessionId);
    const key=requiredConfig("OPENAI_API_KEY");
    const vault = new ModelContextVault(this.store.db);
    const priorInput = call.continuation ? await vault.continuation(sessionId, runId, call.model, call.continuation) : [];
    const attemptId=this.actionId?modelAttemptIdentity(sessionId,this.actionId,call.role):randomUUID();
    const started=Date.now();
    const inputHash=sha256(canonicalJson({instructions:call.instructions,input:call.input,continuation:call.continuation??null,schema:call.schema??null,tools:call.tools??null,model:call.model}));
    const request={model:call.model,store:false,stream:true,include:["reasoning.encrypted_content"],reasoning:{effort:call.reasoningEffort??process.env.OPENAI_REASONING_EFFORT??"max"},max_output_tokens:call.maximumOutputTokens??6144,input:[...priorInput,{role:"developer",content:call.instructions},{role:"user",content:JSON.stringify(call.input)}],...(call.schema?{text:{format:{type:"json_schema",name:call.role.replaceAll(/[^a-zA-Z0-9_]/g,"_"),strict:true,schema:call.schema}}}:{}),...(call.tools?{tools:call.tools,parallel_tool_calls:false,tool_choice:call.toolName?{type:"function",name:call.toolName}:"auto"}:{})};
    const requestHash=sha256(canonicalJson(request));
    const requestSummary={model:request.model,store:false,stream:true,include:request.include,reasoning:request.reasoning,max_output_tokens:request.max_output_tokens,inputItems:request.input.length,continuationFrom:call.continuation?.attemptId??null};
    const record={attemptId,actionId:this.actionId??null,role:call.role,model:call.model,inputHash,requestHash,startedAt:new Date(started).toISOString(),request:requestSummary,status:"running",source:"model_generation"};
    const inserted=await this.store.db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,$4,'running',$5) ON CONFLICT(id) DO NOTHING",[attemptId,sessionId,runId,call.role,JSON.stringify(record)]);
    if (inserted.rowCount !== 1) {
      const existing=(await this.store.db.query<{session_id:string;run_id:string|null;document:string}&Record<string,unknown>>("SELECT session_id,run_id,document FROM lab_model_attempts WHERE id=$1",[attemptId])).rows[0];
      const saved=existing?JSON.parse(existing.document) as typeof record & {receipt?:ModelReceipt;errorCode?:string}:null;
      if(!saved||existing?.session_id!==sessionId||existing.run_id!==runId||saved.inputHash!==inputHash||saved.requestHash!==requestHash)throw new LabError("MODEL_CHECKPOINT_CONFLICT","This action already belongs to different model input.",409);
      if(saved.status==="completed"&&saved.receipt)return saved.receipt;
      throw new LabError(saved.errorCode??"MODEL_DISPATCH_UNKNOWN","The original model attempt is retained. An uncertain request is never automatically sent again.",503);
    }
    const cancel=new AbortController();const timer=this.actionId?setInterval(()=>{void this.assertActive(sessionId).catch(()=>cancel.abort());},1500):null;
    let observedResponse:ModelResponse|null=null;let providerResult:Response|null=null;let jobStatus="failed";let leaseTimer:ReturnType<typeof setInterval>|null=null;
    try{
      await vault.prepare(attemptId,sessionId,runId,request);
      await this.store.claimAuxiliaryJob(`model:${attemptId}`,sessionId,runId,"model",{attemptId,actionId:this.actionId??null,role:call.role,model:call.model,inputHash});
      leaseTimer=setInterval(()=>{void this.store.db.query("UPDATE lab_jobs SET lease_until=$2 WHERE id=$1 AND stage='running'",[`model:${attemptId}`,new Date(Date.now()+120000).toISOString()]).catch(()=>cancel.abort());},15000);
      const result=await this.fetchImpl("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(request),signal:AbortSignal.any([AbortSignal.timeout(Math.min(900000,Math.max(1000,call.timeoutMs??90000))),cancel.signal,...(this.signal?[this.signal]:[])])});
      providerResult=result;
      await this.assertActive(sessionId);
      if(!result.ok){await result.arrayBuffer().catch(()=>{});throw new LabError(`MODEL_HTTP_${result.status}`,"The model provider refused or could not complete this request. The attempt is retained without an invented result.",502);}
      const response=await readModelResponse(result);
      if(typeof response.id!=="string"||typeof response.model!=="string"||typeof response.status!=="string"||!Array.isArray(response.output)||response.output.some(item=>!item||typeof item.type!=="string"))throw new LabError("MODEL_RESPONSE_INVALID","The provider did not return a valid response envelope.",502);
      const context=await vault.retainResponse(attemptId,sessionId,runId,response);
      await this.assertActive(sessionId);observedResponse=publicModelResponse(response);if(response.status!=="completed")throw new LabError("MODEL_INCOMPLETE","The model did not return a completed response. No diagnosis or repair is inferred.",502);
      if(response.output.some(item=>item.content?.some(part=>part.type==="refusal")))throw new LabError("MODEL_REFUSAL","The model declined this request. The attempt is retained.",422);
      const safeResponse=observedResponse;const durationMs=Date.now()-started;const transport=modelTransportReceipt(result);
      const body={attemptId,role:call.role,model:response.model,inputHash,requestHash,response:safeResponse,transport,context,continuationFrom:call.continuation?.attemptId??null,durationMs,provenance:"model_generated",provider:"OpenAI Responses API",reasoningEffort:request.reasoning.effort};
      const evidence:EvidenceDTO={id:attemptId,runId,title:`Model receipt · ${call.role}`,kind:"receipt",source:"sample",createdAt:new Date().toISOString(),sha256:sha256(canonicalJson(body)),summary:"An actual model call using redacted Sample evidence. This is model output, not a provider payment observation.",body,redactions:["Authorization headers and API keys are excluded.","Complete continuation context is encrypted on the server; private and encrypted reasoning are not published."]};
      const receipt:ModelReceipt={attemptId,evidenceId:evidence.id,response:safeResponse,durationMs,inputHash};
      const complete={...record,status:"completed",response:safeResponse,transport,context,receipt,durationMs,completedAt:new Date().toISOString()};
      await this.store.db.transaction(async tx=>{
        if(this.actionId){const action=(await tx.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE",[this.actionId,sessionId])).rows[0];if(action?.stage!=="running")throw new LabError("WORK_CANCELLED","The model action was cancelled before its receipt could be published.",409);}
        await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5)",[evidence.id,sessionId,runId,evidence.createdAt,JSON.stringify(evidence)]);
        await tx.query("UPDATE lab_model_attempts SET status='completed',document=$2 WHERE id=$1",[attemptId,JSON.stringify(complete)]);
      });
      jobStatus="completed";return receipt;
    }catch(error){const code=(cancel.signal.aborted||this.signal?.aborted)?"WORK_CANCELLED":error instanceof LabError||error instanceof ModelTransportError?error.code:error instanceof Error&&error.name==="TimeoutError"?"MODEL_TIMEOUT":"MODEL_TRANSPORT_FAILURE";const status=code==="WORK_CANCELLED"?"cancelled":"failed";jobStatus=status;await this.store.db.query("UPDATE lab_model_attempts SET status=$3,document=$2 WHERE id=$1",[attemptId,JSON.stringify({...record,status,durationMs:Date.now()-started,errorCode:code,providerResponse:observedResponse,transport:modelTransportReceipt(error)??modelTransportReceipt(providerResult)}),status]);if(code==="WORK_CANCELLED")throw new LabError(code,"The model investigation was cancelled. Existing evidence is preserved.",409);if(error instanceof LabError)throw error;throw new LabError(code,"The model call did not complete. Its failed attempt is saved; no fallback output is presented as a model result.",502);}finally{await providerResult?.body?.cancel().catch(()=>{});if(timer)clearInterval(timer);if(leaseTimer)clearInterval(leaseTimer);await this.store.finishAuxiliaryJob(`model:${attemptId}`,jobStatus);}
  }
}
export function outputJson(response:ModelResponse):unknown{
  const text=response.output.filter(item=>item.type==="message").flatMap(item=>item.content??[]).filter(item=>item.type==="output_text").map(item=>item.text??"").join("");if(!text||text.length>100000)throw new LabError("MODEL_SCHEMA","The model did not return a bounded structured answer.",502);try{return JSON.parse(text);}catch{throw new LabError("MODEL_SCHEMA","The model's structured answer could not be parsed.",502);}
}
export const strictObject=(properties:Record<string,unknown>)=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
