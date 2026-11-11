import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { PaypalClient } from 'paypal';
import { encodeFrame } from './channel.mjs';

const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
const pending=new Map();let serial=0;
const first=await new Promise(resolve=>lines.once('line',line=>resolve(JSON.parse(line))));
const control=createWriteStream('',{fd:3,autoClose:false}),bridgeSecret=first.bridgeSecret;
delete first.bridgeSecret;
const send=frame=>control.write(encodeFrame(frame,bridgeSecret)+'\n');
lines.on('line',line=>{const frame=JSON.parse(line),slot=pending.get(frame.id);if(!slot)return;pending.delete(frame.id);if(frame.error){const error=new Error(frame.error);error.code=frame.error;slot.reject(error);}else slot.resolve(frame.value);});
function rpc(method,input){const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});send({kind:'rpc',id,method,input});});}
const transport=async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(url.origin!=='https://api-m.sandbox.paypal.com'||url.search||url.hash)throw new Error('OFFLINE_DESTINATION_DENIED');
  const body=request.body?await request.clone().text():null;
  const headers=Object.fromEntries([...request.headers].filter(([k])=>['paypal-request-id','idempotency-key','prefer','content-type','accept'].includes(k)));
  const wire={method:request.method,path:url.pathname,headers,body:url.pathname==='/v1/oauth2/token'?null:body?JSON.parse(body):null};
  const response=await Promise.race([rpc('wire',wire),new Promise((_,reject)=>{if(request.signal.aborted)reject(request.signal.reason);else request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true});})]);
  if(response.failure)throw new Error(response.failure==='not_sent'?'OFFLINE_PROVEN_NOT_SENT':'OFFLINE_RESPONSE_LOST');
  return new Response(response.rawBody??JSON.stringify(response.body),{status:response.status,headers:{'content-type':'application/json'}});
};
const store={
  get:(table,key)=>rpc('store.get',{table,key}),list:table=>rpc('store.list',{table}),
  insert:(table,key,value)=>rpc('store.insert',{table,key,value}),
  patch:(table,key,value,expectedVersion)=>rpc('store.patch',{table,key,value,...(expectedVersion===undefined?{}:{expectedVersion})}),
  remove:(table,key)=>rpc('store.remove',{table,key}),
  reserve:(key,resource,amountMinor,limitMinor,metadata)=>rpc('store.reserve',{key,resource,amountMinor,limitMinor,metadata}),
};
const client=new PaypalClient({serverOptions:{baseUrl:'https://api-m.sandbox.paypal.com'},oauth2:{clientId:'OFFLINE-FICTIONAL-ID',clientSecret:'OFFLINE-FICTIONAL-SECRET'},fetch:transport,retry:{maxRetries:0,timeout:5000},logging:{level:'off'}});
function requestId(...parts){const h=createHash('sha256').update(JSON.stringify(parts)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
try{const {handle}=await import('/tmp/work/out/candidate.js');if(typeof handle!=='function')throw new Error('MISSING_HANDLE');const value=await handle({client,store,requestId,verify:event=>rpc('verify',event)},first.command);send({kind:'return',value});}
catch(error){send({kind:'return',error:{name:String(error?.name??'Error').slice(0,80),code:String(error?.code??'UNCAUGHT_TARGET_ERROR').slice(0,100),message:String(error?.message??'Target failed').slice(0,600)}});}
finally{control.end();lines.close();process.stdin.destroy();}
