import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {parse} from 'dotenv';
import {canonical,digest} from './protocol';
export type Provider='openai'|'gemini';
export type Json=Record<string,any>;
export interface Credentials {openai:string;gemini:string}
export async function evaluationCredentials(root:string):Promise<Credentials>{
  const env=parse(await readFile(join(root,'.env'),'utf8'));
  const openai=process.env.OPENAI_API_KEY??env.OPENAI_API_KEY,gemini=process.env.GEMINI_API_KEY??env.GEMINI_API_KEY;
  if(!openai||!gemini)throw new Error('The two authorized evaluation provider keys are required.');
  return {openai,gemini};
}
export interface HttpReceipt {provider:Provider;endpoint:string;requestHash:string;startedAt:string;finishedAt:string;durationMs:number;httpStatus:number|null;requestId:string|null;responseHash:string|null;errorCode:string|null;errorDetail?:{type:string|null;code:string|null;parameter:string|null;message:string}}
export interface HttpResult {receipt:HttpReceipt;body:Json|null}
/** Keys are used only in fixed-origin headers and are never part of a receipt. */
export async function providerRequest(provider:Provider,path:string,body:Json,key:string,deadlineMs:number):Promise<HttpResult>{
  if(provider==='openai'?!['/v1/responses','/v1/responses/input_tokens'].includes(path):!['/v1beta/interactions','/v1beta/models/gemini-3.8-flash:countTokens'].includes(path))throw new Error('Provider endpoint is not allowlisted.');
  const endpoint=(provider==='openai'?'https://api.openai.com':'https://generativelanguage.googleapis.com')+path,started=Date.now();
  const receipt:HttpReceipt={provider,endpoint,requestHash:digest(canonical(body)),startedAt:new Date(started).toISOString(),finishedAt:'',durationMs:0,httpStatus:null,requestId:null,responseHash:null,errorCode:null};
  try{
    const response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(provider==='openai'?{Authorization:`Bearer ${key}`}:{'x-goog-api-key':key,'Api-Revision':'2026-05-20'})},body:JSON.stringify(body),signal:AbortSignal.timeout(deadlineMs)});
    receipt.httpStatus=response.status;receipt.requestId=response.headers.get('x-request-id')??response.headers.get('x-goog-request-id');
    const raw=await response.text();receipt.responseHash=digest(raw);
    if(raw.length>8000000){receipt.errorCode='provider_response_limit';return {receipt,body:null};}
    let data:Json;try{data=JSON.parse(raw) as Json;}catch{receipt.errorCode='provider_invalid_json';return {receipt,body:null};}
    if(!response.ok){receipt.errorCode=response.status===429?'provider_429':response.status>=500?'provider_5xx':`provider_${response.status}`;const error=data.error??{};const clean=(value:unknown)=>String(value??'').replaceAll(key,'[REDACTED]').replace(/(?:sk-|AIza)[A-Za-z0-9_-]{12,}/g,'[REDACTED]').slice(0,1200);receipt.errorDetail={type:error.type?clean(error.type):null,code:error.code?clean(error.code):null,parameter:error.param?clean(error.param):null,message:clean(error.message)};return {receipt,body:null};}
    return {receipt,body:data};
  }catch(error){
    const cause=error instanceof Error?(error.cause as {code?:string}|undefined)?.code:undefined;
    receipt.errorCode=['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(cause??'')?'transport_before_response':'provider_transport_unknown';return {receipt,body:null};
  }finally{receipt.durationMs=Date.now()-started;receipt.finishedAt=new Date().toISOString();}
}
