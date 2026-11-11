import {canonical,digest} from './protocol';
import {providerRequest,type Provider,type Json,type HttpReceipt} from './provider-http';
import {toolDefinitions,submissionSchema} from './model-workspace';

export interface GatewayConfig {provider:Provider;model:string;key:string;maximumOutputTokens:number;maximumToolCalls:number;maximumSourceBytes:number;providerDeadlineMs:number;system:string;prompt:string;execute:(name:string,args:Record<string,unknown>)=>unknown;persist:(kind:'dispatch'|'response'|'tool',index:number,value:unknown)=>Promise<void>}
export interface Usage {inputTokens:number;cachedInputTokens:number;outputTokens:number;reasoningTokens:number;totalTokens:number;raw:Json}
export interface GenerationCall {index:number;http:HttpReceipt;responseId:string|null;reportedModel:string|null;status:string|null;usage:Usage|null;visibleOutput:unknown;estimatedCostUsd:number|null;costBasis:string}
export interface Generation {schemaVersion:1;kind:'model_generation';provider:Provider;model:string;status:'completed'|'submission_failure'|'infrastructure_failure';source:string|null;sourceHash:string|null;summary:string|null;errorCode:string|null;calls:GenerationCall[];toolAccesses:Array<{index:number;name:string;arguments:unknown;result:unknown}>;inputTokens:number;outputTokens:number;reasoningTokens:number;totalTokens:number;estimatedCostUsd:number;unpricedCalls:number;durationMs:number;finishedAt:string;receiptHash:string}
export function providerUsage(provider:Provider,body:Json):Usage|null {
  const raw=body.usage;if(!raw||typeof raw!=='object')return null;
  const input=provider==='openai'?raw.input_tokens:raw.total_input_tokens;
  const reasoning=provider==='openai'?(raw.output_tokens_details?.reasoning_tokens??0):(raw.total_thought_tokens??0);
  const output=provider==='openai'?raw.output_tokens:typeof raw.total_output_tokens==='number'?raw.total_output_tokens+reasoning:undefined;
  const cached=provider==='openai'?(raw.input_tokens_details?.cached_tokens??0):(raw.total_cached_tokens??0);
  if(![input,output,reasoning,cached].every(v=>Number.isInteger(v)&&v>=0)||cached>input||reasoning>output)return null;
  return {inputTokens:input,cachedInputTokens:cached,outputTokens:output,reasoningTokens:reasoning,totalTokens:input+output,raw};
}
/** Published text-token rates on 2026-11-11; this is an estimate, not an invoice. */
export function estimateCost(provider:Provider,usage:Usage){
  if(provider==='gemini')return ((usage.inputTokens-usage.cachedInputTokens)*.75+usage.cachedInputTokens*.075+usage.outputTokens*3.75)/1000000;
  const long=usage.inputTokens>272000;
  const written=Number(usage.raw.input_tokens_details?.cache_creation_tokens??usage.raw.input_tokens_details?.cache_write_tokens??0);
  return (Math.max(0,usage.inputTokens-usage.cachedInputTokens-written)*(long?4:2)+usage.cachedInputTokens*(long?.2:.1)+written*(long?5:2.5)+usage.outputTokens*(long?15:10))/1000000;
}
const visible=(provider:Provider,body:Json)=>provider==='openai'?(body.output??[]).filter((v:Json)=>['message','function_call'].includes(v.type)).map((v:Json)=>v.type==='function_call'?{type:v.type,id:v.id,call_id:v.call_id,name:v.name,arguments:v.arguments}:{type:v.type,id:v.id,role:v.role,content:(v.content??[]).filter((c:Json)=>['output_text','refusal'].includes(c.type)).map((c:Json)=>({type:c.type,text:c.text??c.refusal??''}))}):(body.steps??[]).filter((v:Json)=>['model_output','function_call'].includes(v.type)).map((v:Json)=>v.type==='function_call'?{type:v.type,id:v.id,name:v.name,arguments:v.arguments}:{type:v.type,content:(v.content??[]).filter((c:Json)=>c.type==='text').map((c:Json)=>({type:c.type,text:c.text??''}))});
function finalText(provider:Provider,body:Json):string {
  if(provider==='openai')return (body.output??[]).filter((v:Json)=>v.type==='message').flatMap((v:Json)=>v.content??[]).filter((v:Json)=>v.type==='output_text').map((v:Json)=>String(v.text??'')).join('');
  return (body.steps??[]).filter((v:Json)=>v.type==='model_output').flatMap((v:Json)=>v.content??[]).filter((v:Json)=>v.type==='text').map((v:Json)=>String(v.text??'')).join('');
}
export async function generateCandidate(config:GatewayConfig):Promise<Generation>{
  const started=Date.now(),calls:GenerationCall[]=[],toolAccesses:Generation['toolAccesses']=[];
  const history:Json[]=[{role:'user',content:config.prompt}];
  let previous:string|undefined,input:unknown=config.prompt,usedOutput=0,source:string|null=null,summary:string|null=null,status:Generation['status']='submission_failure',errorCode:string|null='NO_FINAL_SUBMISSION';
  for(let round=0;round<=config.maximumToolCalls;round++){
    const remaining=config.maximumOutputTokens-usedOutput;if(remaining<64){errorCode='OUTPUT_BUDGET_EXHAUSTED';break;}
    const toolsAvailable=toolAccesses.length<config.maximumToolCalls;
    const request:Json=config.provider==='openai'?{
      model:config.model,instructions:config.system,input:history,store:false,include:['reasoning.encrypted_content'],reasoning:{effort:'max'},max_output_tokens:remaining,service_tier:'default',
      tools:toolsAvailable?toolDefinitions.map(t=>({...t,strict:true})):[],parallel_tool_calls:true,tool_choice:toolsAvailable?'auto':'none',
      text:{format:{type:'json_schema',name:'candidate_submission',strict:true,schema:submissionSchema}},
    }:{
      model:config.model,system_instruction:config.system,input,store:true,tools:toolsAvailable?toolDefinitions:[],
      generation_config:{thinking_level:'high',max_output_tokens:remaining},response_format:{type:'text',mime_type:'application/json',schema:submissionSchema},...(previous?{previous_interaction_id:previous}:{}),
    };
    await config.persist('dispatch',round,{provider:config.provider,request,requestHash:digest(canonical(request)),dispatchedAt:new Date().toISOString()});
    const result=await providerRequest(config.provider,config.provider==='openai'?'/v1/responses':'/v1beta/interactions',request,config.key,config.providerDeadlineMs),body=result.body;
    const usage=body?providerUsage(config.provider,body):null;
    const call:GenerationCall={index:round,http:result.receipt,responseId:typeof body?.id==='string'?body.id:null,reportedModel:typeof body?.model==='string'?body.model:null,status:typeof body?.status==='string'?body.status:null,usage,visibleOutput:body?visible(config.provider,body):null,estimatedCostUsd:usage?estimateCost(config.provider,usage):null,costBasis:'Published standard text rates, including reported cached/reasoning tokens; unreported cache-write billing and failed-call charges are not an invoice.'};
    calls.push(call);await config.persist('response',round,call);
    if(!body){status='infrastructure_failure';errorCode=result.receipt.errorCode??'provider_no_response';break;}
    if(!usage){status='infrastructure_failure';errorCode='provider_usage_unavailable';break;}
    usedOutput+=usage.outputTokens;
    if(usedOutput>config.maximumOutputTokens){errorCode='OUTPUT_BUDGET_EXCEEDED';break;}
    if(call.reportedModel&&call.reportedModel.replace(/^models\//,'')!==config.model){status='infrastructure_failure';errorCode='provider_model_changed';break;}
    const toolCalls:Json[]=config.provider==='openai'?(body.output??[]).filter((v:Json)=>v.type==='function_call'):(body.steps??[]).filter((v:Json)=>v.type==='function_call');
    if(toolCalls.length){
      if(!call.responseId){status='infrastructure_failure';errorCode='provider_missing_continuation_id';break;}
      const outputs=[];
      for(const tool of toolCalls){
        let args:unknown=tool.arguments;try{if(typeof args==='string')args=JSON.parse(args);}catch{args=null;}
        const result=toolAccesses.length>=config.maximumToolCalls?{error:'TOOL_CALL_LIMIT'}:args&&typeof args==='object'&&!Array.isArray(args)?config.execute(String(tool.name),args as Record<string,unknown>):{error:'INVALID_ARGUMENTS'};
        const access={index:toolAccesses.length,name:String(tool.name),arguments:args,result};toolAccesses.push(access);await config.persist('tool',access.index,access);
        outputs.push(config.provider==='openai'?{type:'function_call_output',call_id:tool.call_id,output:JSON.stringify(result)}:{type:'function_result',name:tool.name,call_id:tool.id,result:[{type:'text',text:JSON.stringify(result)}]});
      }
      if(config.provider==='openai')history.push(...(body.output??[]),...outputs);
      else {previous=call.responseId;input=outputs;}
      continue;
    }
    if(body.status!=='completed'){errorCode=`PROVIDER_FINAL_${String(body.status??'UNKNOWN').toUpperCase()}`;break;}
    const text=finalText(config.provider,body);
    let submitted:unknown;try{submitted=JSON.parse(text);}catch{errorCode='INVALID_FINAL_JSON';break;}
    if(!submitted||typeof submitted!=='object'||!('source'in submitted)||typeof submitted.source!=='string'||!submitted.source.trim()||Buffer.byteLength(submitted.source)>config.maximumSourceBytes){errorCode='INVALID_FINAL_SOURCE';break;}
    source=submitted.source;summary='summary'in submitted&&typeof submitted.summary==='string'?submitted.summary.slice(0,4000):null;status='completed';errorCode=null;break;
  }
  const record={schemaVersion:1 as const,kind:'model_generation' as const,provider:config.provider,model:config.model,status,source,sourceHash:source===null?null:digest(source),summary,errorCode,calls,toolAccesses,inputTokens:calls.reduce((s,c)=>s+(c.usage?.inputTokens??0),0),outputTokens:usedOutput,reasoningTokens:calls.reduce((s,c)=>s+(c.usage?.reasoningTokens??0),0),totalTokens:calls.reduce((s,c)=>s+(c.usage?.totalTokens??0),0),estimatedCostUsd:calls.reduce((s,c)=>s+(c.estimatedCostUsd??0),0),unpricedCalls:calls.filter(c=>!c.usage).length,durationMs:Date.now()-started,finishedAt:new Date().toISOString()};
  return {...record,receiptHash:digest(canonical(record))};
}
