import {PaypalError,type Order} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
function duplicate(e:unknown){return typeof e==='object'&&e!==null&&'code'in e&&e.code==='SQLITE_CONSTRAINT_UNIQUE';}
async function apply(c:Context,key:string,intent:Row,order:Order):Promise<Result>{
  const unit=order.purchaseUnits?.find(p=>p.customId===key),captures=unit?.payments?.captures??[];
  const capture=captures.find(p=>p.status==='COMPLETED'&&p.id&&p.amount?.currencyCode===intent.currency&&Math.round(Number(p.amount?.value)*100)===intent.amountMinor);
  if(!capture?.id)return {status:captures.some(p=>p.status==='PENDING')?'pending':'unknown',httpStatus:202};
  try{await c.store.insert('entitlements',key,{intentId:key,captureId:capture.id,amountMinor:intent.amountMinor});}catch(e){if(!duplicate(e))throw e;}
  await c.store.patch('capture_operations',key,{state:'paid',captureId:capture.id});return {status:'paid',httpStatus:200,captureId:capture.id};
}
async function recover(c:Context,key:string,intent:Row):Promise<Result>{let order:Order;try{order=await c.client.orders.getOrder({id:String(intent.orderId)});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}return apply(c,key,intent,order);}
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.intentId),intent=await c.store.get('intents',key);if(!intent)return {status:'missing',httpStatus:404};if(intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  const old=await c.store.get('capture_operations',key);
  if(old&&old.state!=='not_sent')return recover(c,key,intent);
  try{if(old)await c.store.patch('capture_operations',key,{state:'dispatching'},old.version);else await c.store.insert('capture_operations',key,{state:'dispatching',orderId:intent.orderId});}
  catch(e){if(duplicate(e)||typeof e==='object'&&e!==null&&'code'in e&&e.code==='VERSION_CONFLICT')return recover(c,key,intent);throw e;}
  let order:Order;
  try{order=await c.client.orders.captureOrder({id:String(intent.orderId),body:{},payPalRequestId:c.requestId('capture',key),prefer:'return=representation'});}
  catch(e){if(!(e instanceof PaypalError))throw e;
    if(e.kind==='auth'||e.kind==='encode'){await c.store.patch('capture_operations',key,{state:'not_sent'});return {status:'not_sent',httpStatus:503};}
    if(e.kind==='api'&&e.status>=400&&e.status<500&&e.status!==408){await c.store.patch('capture_operations',key,{state:'refused'});return {status:'refused',httpStatus:422};}
    await c.store.patch('capture_operations',key,{state:'unknown'});return recover(c,key,intent);}
  const result=await apply(c,key,intent,order);return result.status==='unknown'?recover(c,key,intent):result;
}
