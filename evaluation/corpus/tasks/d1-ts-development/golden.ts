import {PaypalError,type Order} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
function duplicate(error:unknown){return typeof error==='object'&&error!==null&&'code'in error&&error.code==='SQLITE_CONSTRAINT_UNIQUE';}
async function paid(c:Context,key:string,intent:Row,order:Order):Promise<Result>{
  const unit=order.purchaseUnits?.find(unit=>unit.customId===key);
  const capture=unit?.payments?.captures?.find(payment=>payment.status==='COMPLETED'&&payment.id&&payment.amount&&payment.amount.currencyCode===intent.currency&&Math.round(Number(payment.amount.value)*100)===intent.amountMinor);
  if(!capture?.id)return {status:unit?.payments?.captures?.some(p=>p.status==='PENDING')?'pending':'unknown',httpStatus:202};
  try{await c.store.insert('entitlements',key,{intentId:key,captureId:capture.id,amountMinor:intent.amountMinor});}catch(error){if(!duplicate(error))throw error;}
  await c.store.patch('purchases',key,{state:'complete',captureId:capture.id});
  return {status:'paid',httpStatus:200,captureId:capture.id};
}
async function read(c:Context,key:string,intent:Row,orderId:string):Promise<Result>{
  try{return await paid(c,key,intent,await c.client.orders.getOrder({id:orderId}));}
  catch(error){if(!(error instanceof PaypalError))throw error;return {status:'unknown',httpStatus:202};}
}
export async function handle(c:Context,command:Data):Promise<Result>{
  const key=String(command.intentId),intent=await c.store.get('intents',key);
  if(!intent)return {status:'missing',httpStatus:404};
  if(intent.accountId!==command.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  let prior=await c.store.get('purchases',key);
  if(!prior){try{await c.store.insert('purchases',key,{state:'creating',intentId:key,amountMinor:intent.amountMinor});}
    catch(error){if(!duplicate(error))throw error;prior=await c.store.get('purchases',key);}}
  if(prior){if(prior.state==='complete')return {status:'paid',httpStatus:200,captureId:prior.captureId};
    return prior.orderId?read(c,key,intent,String(prior.orderId)):{status:'unknown',httpStatus:202};}
  let orderId:string|undefined;
  try{
    const order=await c.client.orders.createOrder({body:{intent:'CAPTURE',purchaseUnits:[{customId:key,amount:{currencyCode:String(intent.currency),value:(Number(intent.amountMinor)/100).toFixed(2)}}]},payPalRequestId:c.requestId('purchase',key,'create'),prefer:'return=representation'});
    if(!order.id){await c.store.patch('purchases',key,{state:'unknown'});return {status:'unknown',httpStatus:202};}
    orderId=order.id;await c.store.patch('purchases',key,{state:'capturing',orderId});
    return await paid(c,key,intent,await c.client.orders.captureOrder({id:orderId,body:{},payPalRequestId:c.requestId('purchase',key,'capture'),prefer:'return=representation'}));
  }catch(error){
    if(!(error instanceof PaypalError))throw error;
    if(error.kind==='auth'||error.kind==='encode'){await c.store.patch('purchases',key,{state:'not_sent'});return {status:'not_sent',httpStatus:503};}
    if(error.kind==='api'&&error.status>=400&&error.status<500){await c.store.patch('purchases',key,{state:'refused'});return {status:'refused',httpStatus:422};}
    await c.store.patch('purchases',key,{state:'unknown'});return orderId?read(c,key,intent,orderId):{status:'unknown',httpStatus:202};
  }
}
