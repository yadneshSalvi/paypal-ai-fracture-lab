import {PaypalError,Orders,type Order} from 'paypal';
import type {Context,Data,Result} from './api.js';
const unknown=():Result=>({status:'unknown',httpStatus:202,code:'OUTCOME_UNKNOWN',retryable:false});
function coded(e:unknown,code:string){return typeof e==='object'&&e!==null&&'code'in e&&e.code===code;}
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.jobId),job=await c.store.get('agent_jobs',key),args=x.arguments as Data;const intent=job?await c.store.get('intents',String(job.intentId)):null;
  if(!job||!intent||job.accountId!==x.accountId||intent.accountId!==x.accountId||!job.approved||!intent.authorized||args.intentId!==job.intentId||args.amountMinor!==intent.amountMinor||args.currency!==intent.currency||Number(intent.amountMinor)>Number(job.budgetMinor))return {status:'denied',httpStatus:403,code:'POLICY_DENIED',retryable:false};
  const result=await c.store.get('tool_results',key);if(result)return {status:'ready',httpStatus:200,code:'ORDER_READY',retryable:false,orderId:result.orderId};
  const old=await c.store.get('tool_operations',key);if(old&&old.state!=='not_sent')return unknown();
  const requestId=c.requestId('errand-create-job',key);try{if(old)await c.store.patch('tool_operations',key,{state:'unknown'},old.version);else await c.store.insert('tool_operations',key,{state:'unknown',requestId,intentId:job.intentId,amountMinor:intent.amountMinor,currency:intent.currency});}
  catch(e){if(coded(e,'SQLITE_CONSTRAINT_UNIQUE')||coded(e,'VERSION_CONFLICT'))return unknown();throw e;}
  let order:Order;try{order=await c.client.orders.createOrder({body:{intent:'CAPTURE',purchaseUnits:[{customId:String(job.intentId),amount:{currencyCode:String(intent.currency),value:(Number(intent.amountMinor)/100).toFixed(2)}}]},payPalRequestId:requestId,prefer:'return=representation'});}
  catch(e){if(!(e instanceof PaypalError))throw e;
    if(e.kind==='auth'||e.kind==='encode'){await c.store.patch('tool_operations',key,{state:'not_sent'});return {status:'not_sent',httpStatus:503,code:e.kind==='auth'?'AUTHENTICATION_UNAVAILABLE':'INVALID_REQUEST',retryable:true};}
    if(e.kind==='api'&&e.status>=400&&e.status<500&&e.status!==408){const code=e instanceof Orders.CreateOrderError&&e.payload.kind!=='undeclared'?e.payload.body.details?.[0]?.issue??'PROVIDER_REFUSAL':'PROVIDER_REFUSAL';await c.store.patch('tool_operations',key,{state:'refused',code});return {status:'refused',httpStatus:422,code,retryable:false};}
    return unknown();}
  const matched=order.purchaseUnits?.some(p=>p.customId===job.intentId&&p.amount?.currencyCode===intent.currency&&Math.round(Number(p.amount?.value)*100)===intent.amountMinor);if(!order.id||!matched)return unknown();
  await c.store.insert('tool_results',key,{orderId:order.id,intentId:job.intentId});await c.store.patch('tool_operations',key,{state:'ready',orderId:order.id});return {status:'ready',httpStatus:200,code:'ORDER_READY',retryable:false,orderId:order.id};
}
