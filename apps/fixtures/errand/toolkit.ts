import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { sha256, canonicalJson } from '@fracture/paypal-core';
import { artifactPath } from '../../../packages/service/src/config';
import { LabError } from '../../../packages/service/src/errors';
import type { LocalPayPalTransport } from '../../../packages/runner/src/local-provider';

export const errandArguments = {currencyCode:'USD',items:[{name:'The shape of quiet',quantity:1,itemCost:12,itemTotal:12,taxPercent:0}],returnUrl:'https://example.invalid/sample-return',cancelUrl:'https://example.invalid/sample-cancel'};
export interface ToolkitResult { orderId:string; status:string; schemaHash:string; exposed:string[] }
/** The installed Toolkit runs in a separate heap with a local-only Axios adapter. */
export async function callErrandToolkit(transport:LocalPayPalTransport,requestId:string,args:unknown=errandArguments,tool='create_order'):Promise<ToolkitResult>{
  if(tool!=='create_order')throw new LabError('ERRAND_TOOL_DENIED','This fixture only admits order creation.',403);
  if(canonicalJson(args)!==canonicalJson(errandArguments))throw new LabError('ERRAND_ARGUMENTS_DENIED','Only the frozen $12 sample intent is admitted.',403);
  // A static module edge lets Next trace the worker's complete dependency closure.
  const { PayPalAgentToolkit }=await import('@paypal/agent-toolkit/openai');
  if(typeof PayPalAgentToolkit!=='function')throw new LabError('ERRAND_TOOLKIT_UNAVAILABLE','The pinned Toolkit is unavailable.',503);
  const worker=new Worker(artifactPath('apps/fixtures/errand/toolkit-worker.mjs'),{env:{NODE_ENV:'production'},workerData:{tool,arguments:args,requestId,callId:randomUUID()},stdout:true,stderr:true});
  worker.stdout.resume();worker.stderr.resume();
  let orderDispatched=false;
  try{return await new Promise<ToolkitResult>((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new LabError('ERRAND_TOOL_TIMEOUT','The tool worker did not return an observation.',504)),20000);
    let done=false;
    const finish=(error:unknown,value?:ToolkitResult)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(value!);};
    worker.once('error',()=>finish(new LabError('ERRAND_WORKER_FAILED','The isolated tool worker stopped.',502)));
    worker.once('exit',()=>{if(!done)finish(new LabError('ERRAND_WORKER_EXIT','The tool worker exited without a retained result.',502));});
    worker.on('message',async message=>{
      if(done)return;
      if(message.type==='request'){
        try{
          if(message.method!=='POST'||!['/v1/oauth2/token','/v2/checkout/orders'].includes(message.path))throw new Error('endpoint');
          if(message.path==='/v2/checkout/orders')orderDispatched=true;
          const reply=await transport.fetch(`https://api-m.sandbox.paypal.com${message.path}`,{method:'POST',headers:message.headers,body:message.body});
          worker.postMessage({id:message.id,status:reply.status,headers:Object.fromEntries(reply.headers),body:await reply.json()});
        }catch{if(!done)worker.postMessage({id:message.id,error:true});}
      }else if(message.type==='failure')finish(new LabError(message.status>=400&&message.status<500&&message.status!==429?'ERRAND_REFUSED':message.code,'The tool did not obtain an order response.',502));
      else if(message.type==='result'){
        const value=message.result;
        if(!value||typeof value.id!=='string'||value.status!=='CREATED')return finish(new LabError('ERRAND_RESULT_INVALID','The tool returned no validated created order.',502));
        finish(null,{orderId:value.id,status:value.status,schemaHash:sha256(canonicalJson(message.schema)),exposed:message.exposed});
      }
    });
  });}catch(error){if(!orderDispatched)throw new LabError('ERRAND_NOT_SENT','The order request never left the tool worker.',502);throw error;}finally{await worker.terminate();}
}
