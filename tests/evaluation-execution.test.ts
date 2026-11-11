import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {canonical,digest} from '../packages/evaluation/src/protocol';
import {saveNew,readJson,verifyReceipt} from '../packages/evaluation/src/artifacts';
import {EvaluationWorld,StoreFailure} from '../packages/evaluation/src/world';
import {generateCandidate,providerUsage,type GatewayConfig} from '../packages/evaluation/src/gateway';
import {encodeFrame,decodeFrame} from '../packages/evaluation/runtime/channel.mjs';

test('the bridge rejects forged, changed and cross-worker control frames',()=>{
  const key='01'.repeat(32),other='02'.repeat(32),frame={kind:'rpc',id:1,method:'wire',input:{method:'GET',path:'/v2/checkout/orders/test'}};
  const sealed=encodeFrame(frame,key);assert.deepEqual(decodeFrame(sealed,key),frame);assert.equal(decodeFrame(sealed,other),null);
  assert.equal(decodeFrame(JSON.stringify(frame),key),null);
  const tampered=JSON.parse(sealed);tampered.payload=tampered.payload.replace('GET','POST');assert.equal(decodeFrame(JSON.stringify(tampered),key),null);
  assert.equal(decodeFrame('{"payload":"{}","signature":"00"}',key),null);
});

test('receipt hashes survive JSON persistence without allowing a changed verdict',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'fracture-receipt-'));
  try{
    const body={verdict:false,optional:undefined,events:[null,{key:'value'}]},receipt={...body,receiptHash:digest(canonical(body))};
    await saveNew(join(dir,'receipt.json.gz'),receipt);const restored=verifyReceipt(await readJson(join(dir,'receipt.json.gz')));assert.equal(restored.verdict,false);
    assert.throws(()=>verifyReceipt({...restored,verdict:true}),/hash/);
    await assert.rejects(saveNew(join(dir,'receipt.json.gz'),{verdict:true}),{code:'EEXIST'});
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('atomic SQL capacity holds an unknown refund and releases only an explicit refused reservation',async()=>{
  const world=new EvaluationWorld(':memory:');
  try{
    const attempts=await Promise.allSettled(['one','two'].map(key=>world.rpc(key,'store.reserve',{key,resource:'capture',amountMinor:600,limitMinor:1000,metadata:{}})));
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(world.rows('reservations').length,1);
    const winner=world.rows('reservations')[0]!;await world.rpc('observer','store.patch',{table:'reservations',key:winner.key,value:{state:'unknown'}});
    await assert.rejects(world.rpc('later','store.reserve',{key:'three',resource:'capture',amountMinor:600,limitMinor:1000,metadata:{}}),(e:unknown)=>e instanceof StoreFailure&&e.code==='CAPACITY_EXCEEDED');
    await world.rpc('observer','store.patch',{table:'reservations',key:winner.key,value:{state:'refused'}});
    await world.rpc('later','store.reserve',{key:'three',resource:'capture',amountMinor:600,limitMinor:1000,metadata:{}});assert.equal(world.rows('reservations').length,2);
  }finally{world.close();}
});

test('the offline provider refuses refunds against pending money and preserves distinct request identities',async()=>{
  const world=new EvaluationWorld(':memory:');
  try{
    world.seed('intents','intent',{amountMinor:1000,currency:'USD'});world.addCapture('intent','capture',1000,'order','PENDING');
    const request={method:'POST',path:'/v2/payments/captures/capture/refund',headers:{'paypal-request-id':'one'},body:{amount:{currency_code:'USD',value:'2.00'},custom_id:'return-one'}};
    const pending=await world.rpc('target','wire',request) as {status:number};assert.equal(pending.status,422);assert.equal(world.refunds.size,0);
    world.captures.get('capture')!.status='COMPLETED';await world.rpc('target','wire',request);await world.rpc('target','wire',request);assert.equal(world.refunds.size,1);
    const wrong=await world.rpc('target','wire',{...request,body:{...request.body,amount:{currency_code:'USD',value:'3.00'}}}) as {status:number};assert.equal(wrong.status,422);assert.equal(world.refunds.size,1);
    await world.rpc('target','wire',{...request,headers:{'paypal-request-id':'two'},body:{...request.body,custom_id:'return-two'}});assert.equal(world.refunds.size,2);
  }finally{world.close();}
});

test('Gemini thought tokens enter the output limit once; OpenAI reasoning is already inside output_tokens',()=>{
  assert.deepEqual(providerUsage('gemini',{usage:{total_input_tokens:100,total_output_tokens:30,total_thought_tokens:20,total_cached_tokens:10}}),{inputTokens:100,cachedInputTokens:10,outputTokens:50,reasoningTokens:20,totalTokens:150,raw:{total_input_tokens:100,total_output_tokens:30,total_thought_tokens:20,total_cached_tokens:10}});
  assert.equal(providerUsage('openai',{usage:{input_tokens:100,output_tokens:50,output_tokens_details:{reasoning_tokens:20}}})?.outputTokens,50);
});

async function gatewayFixture(responses:unknown[],maximumOutputTokens=65536){
  const fetchOriginal=globalThis.fetch,requests:Record<string,any>[]=[],events:unknown[]=[];
  globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(String(init?.body)));const next=responses.shift() as {status?:number;body?:unknown};if(!next)throw new Error('Unexpected additional provider request.');return new Response(JSON.stringify(next.body),{status:next.status??200,headers:{'Content-Type':'application/json','x-request-id':`synthetic-binding-${requests.length}`}});};
  const config:GatewayConfig={provider:'openai',model:'gpt-6.1-sol',key:'TEST_KEY_NEVER_SENT_TO_NETWORK',maximumOutputTokens,maximumToolCalls:24,maximumSourceBytes:120000,providerDeadlineMs:900000,system:'Synthetic adapter test; not study evidence.',prompt:'Read a declared file then submit.',execute:()=>({content:'test fixture'}),persist:async(kind,index,value)=>{events.push({kind,index,value});}};
  try{return {result:await generateCandidate(config),requests,events};}finally{globalThis.fetch=fetchOriginal;}
}
const usage={input_tokens:40,input_tokens_details:{cached_tokens:0,cache_write_tokens:0},output_tokens:20,output_tokens_details:{reasoning_tokens:10},total_tokens:60};
test('the ZDR gateway carries opaque reasoning and tool results without exposing reasoning in receipts',async()=>{
  const {result,requests}=await gatewayFixture([
    {body:{id:'resp-one',model:'gpt-6.1-sol',status:'completed',usage,output:[{type:'reasoning',id:'reasoning-one',encrypted_content:'opaque-test',summary:[]},{type:'function_call',id:'fc-one',call_id:'call-one',name:'read_file',arguments:'{"path":"api.ts","startLine":1,"lineCount":1}'}]}},
    {body:{id:'resp-two',model:'gpt-6.1-sol',status:'completed',usage,output:[{type:'message',id:'message-two',role:'assistant',content:[{type:'output_text',text:JSON.stringify({source:'export const handle=()=>({status:"sample",httpStatus:200});',summary:'synthetic fixture'})}]}]}},
  ]);
  assert.equal(result.status,'completed');assert.equal(result.calls.length,2);assert.equal(result.totalTokens,120);assert.equal(requests[1]!.store,false);assert.equal(requests[1]!.previous_response_id,undefined);
  assert(requests[1]!.input.some((v:Record<string,unknown>)=>v.type==='function_call_output'&&v.call_id==='call-one'));
  assert(requests[1]!.input.some((v:Record<string,unknown>)=>v.encrypted_content==='opaque-test'));
  assert(!JSON.stringify(result).includes('opaque-test'));verifyReceipt(JSON.parse(JSON.stringify(result)));
});

test('a missing final source stays a failed first submission without a quality retry',async()=>{
  const {result,requests}=await gatewayFixture([{body:{id:'resp-empty',model:'gpt-6.1-sol',status:'completed',usage,output:[{type:'message',id:'empty',role:'assistant',content:[{type:'output_text',text:'{"source":"","summary":"no answer"}'}]}]}}]);
  assert.equal(result.status,'submission_failure');assert.equal(result.errorCode,'INVALID_FINAL_SOURCE');assert.equal(requests.length,1);assert.equal(result.sourceHash,null);
});
test('provider failures remain infrastructure records and the gateway never silently retries them',async()=>{
  const {result,requests}=await gatewayFixture([{status:429,body:{error:{type:'rate_limit_error',message:'Quota unavailable'}}}]);
  assert.equal(result.status,'infrastructure_failure');assert.equal(result.errorCode,'provider_429');assert.equal(requests.length,1);assert.equal(result.unpricedCalls,1);assert.equal(result.calls[0]!.http.requestId,'synthetic-binding-1');
});
test('cumulative output budget stops a tool loop before an extra generation request',async()=>{
  const {result,requests}=await gatewayFixture([{body:{id:'resp-budget',model:'gpt-6.1-sol',status:'completed',usage:{...usage,output_tokens:100},output:[{type:'function_call',id:'fc-budget',call_id:'call-budget',name:'inspect_baseline',arguments:'{}'}]}}],128);
  assert.equal(result.errorCode,'OUTPUT_BUDGET_EXHAUSTED');assert.equal(result.status,'submission_failure');assert.equal(requests.length,1);
});
