import {PaypalError,Orders,type Order} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
const unknown=():Result=>({status:'unknown',httpStatus:202,code:'OUTCOME_UNKNOWN',retryable:false});
function coded(e:unknown,code:string){return typeof e==='object'&&e!==null&&'code'in e&&e.code===code;}
async function apply(c:Context,key:string,intent:Row,order:Order):Promise<Result>{const captures=order.purchaseUnits?.find(p=>p.customId===key)?.payments?.captures??[];const paid=captures.find(p=>p.status==='COMPLETED'&&p.id&&p.amount?.currencyCode===intent.currency&&Math.round(Number(p.amount?.value)*100)===intent.amountMinor);if(!paid?.id)return captures.some(p=>p.status==='PENDING')?{status:'pending',httpStatus:202,code:'CAPTURE_PENDING',retryable:false}:unknown();try{await c.store.insert('entitlements',key,{captureId:paid.id,amountMinor:intent.amountMinor});}catch(e){if(!coded(e,'SQLITE_CONSTRAINT_UNIQUE'))throw e;}await c.store.patch('agent_captures',key,{state:'completed',captureId:paid.id});return {status:'completed',httpStatus:200,code:'CAPTURE_CONFIRMED',retryable:false,captureId:paid.id};}
async function recover(c:Context,key:string,intent:Row,orderId:string):Promise<Result>{let order:Order;try{order=await c.client.orders.getOrder({id:orderId});}catch(e){if(!(e instanceof PaypalError))throw e;return unknown();}return apply(c,key,intent,order);}
export async function handle(c:Context,x:Data):Promise<Result>{
  const grant=await c.store.get('tool_grants',String(x.grantId)),intent=grant?await c.store.get('intents',String(grant.intentId)):null;
  if(!grant||!intent||!grant.approved||!intent.authorized||grant.accountId!==x.accountId||intent.accountId!==x.accountId||x.operation!=='capture'||grant.operation!=='capture'||x.orderId!==grant.orderId)return {status:'denied',httpStatus:403,code:'POLICY_DENIED',retryable:false};
  const key=String(grant.intentId),old=await c.store.get('agent_captures',key);if(old&&!['not_sent','rate_limited'].includes(String(old.state)))return recover(c,key,intent,String(grant.orderId));
  try{if(old)await c.store.patch('agent_captures',key,{state:'unknown'},old.version);else await c.store.insert('agent_captures',key,{state:'unknown',orderId:grant.orderId,requestId:c.requestId('relay-capture',key)});}catch(e){if(coded(e,'SQLITE_CONSTRAINT_UNIQUE')||coded(e,'VERSION_CONFLICT'))return recover(c,key,intent,String(grant.orderId));throw e;}
  let order:Order;try{order=await c.client.orders.captureOrder({id:String(grant.orderId),body:{},payPalRequestId:c.requestId('relay-capture',key),prefer:'return=representation'});}
  catch(e){if(!(e instanceof PaypalError))throw e;
    if(e.kind==='auth'||e.kind==='encode'){await c.store.patch('agent_captures',key,{state:'not_sent'});return {status:'not_sent',httpStatus:503,code:e.kind==='auth'?'AUTHENTICATION_UNAVAILABLE':'INVALID_REQUEST',retryable:true};}
    if(e.kind==='api'&&e.status>=400&&e.status<500&&e.status!==408){const rate=e.status===429;const code=rate?'RATE_LIMITED':e.status===401||e.status===403?'PROVIDER_AUTHORIZATION':e instanceof Orders.CaptureOrderError&&e.payload.kind!=='undeclared'?e.payload.body.details?.[0]?.issue??'PROVIDER_REFUSAL':'PROVIDER_REFUSAL';await c.store.patch('agent_captures',key,{state:rate?'rate_limited':'refused',code});return {status:rate?'rate_limited':'refused',httpStatus:rate?429:422,code,retryable:rate};}
    return recover(c,key,intent,String(grant.orderId));}
  const result=await apply(c,key,intent,order);return result.status==='unknown'?recover(c,key,intent,String(grant.orderId)):result;
}
