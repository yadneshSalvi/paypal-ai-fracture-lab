import {PaypalError,type Order} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
function duplicate(e:unknown){return typeof e==='object'&&e!==null&&'code'in e&&e.code==='SQLITE_CONSTRAINT_UNIQUE';}
function belongs(order:Order,key:string,intent:Row){return order.purchaseUnits?.some(p=>p.customId===key&&p.amount?.currencyCode===intent.currency&&Math.round(Number(p.amount?.value)*100)===intent.amountMinor)===true;}
async function settle(c:Context,key:string,intent:Row,order:Order):Promise<Result>{
  if(!belongs(order,key,intent))return {status:'forbidden',httpStatus:403};
  const captures=order.purchaseUnits?.find(p=>p.customId===key)?.payments?.captures??[];
  const paid=captures.find(p=>p.status==='COMPLETED'&&p.id&&p.amount?.currencyCode===intent.currency&&Math.round(Number(p.amount?.value)*100)===intent.amountMinor);
  if(!paid?.id)return {status:captures.some(p=>p.status==='PENDING')?'pending':'unknown',httpStatus:202};
  try{await c.store.insert('entitlements',key,{intentId:key,captureId:paid.id,amountMinor:intent.amountMinor});}catch(e){if(!duplicate(e))throw e;}
  await c.store.patch('winners',key,{state:'completed',captureId:paid.id});return {status:'paid',httpStatus:200,captureId:paid.id};
}
async function reconcile(c:Context,key:string,intent:Row,orderId:string):Promise<Result>{try{return await settle(c,key,intent,await c.client.orders.getOrder({id:orderId}));}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}}
export async function handle(c:Context,x:Data):Promise<Result>{
  const approval=await c.store.get('approvals',String(x.orderId));if(!approval)return {status:'missing',httpStatus:404};
  const key=String(approval.intentId),intent=await c.store.get('intents',key);if(!intent||intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  const prior=await c.store.get('winners',key);if(prior)return reconcile(c,key,intent,String(prior.orderId));
  let order:Order;try{order=await c.client.orders.getOrder({id:String(x.orderId)});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}
  if(!belongs(order,key,intent))return {status:'forbidden',httpStatus:403};
  try{await c.store.insert('winners',key,{orderId:x.orderId,state:'capturing'});}catch(e){if(!duplicate(e))throw e;const winner=await c.store.get('winners',key);return winner?reconcile(c,key,intent,String(winner.orderId)):{status:'unknown',httpStatus:202};}
  try{return await settle(c,key,intent,await c.client.orders.captureOrder({id:String(x.orderId),body:{},payPalRequestId:c.requestId('reservation',key,'capture'),prefer:'return=representation'}));}
  catch(e){if(!(e instanceof PaypalError))throw e;
    if(e.kind==='auth'||e.kind==='encode')return {status:'not_sent',httpStatus:503};
    if(e.kind==='api'&&e.status>=400&&e.status<500)return {status:'refused',httpStatus:422};
    return reconcile(c,key,intent,String(x.orderId));}
}
