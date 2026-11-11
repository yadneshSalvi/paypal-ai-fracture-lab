import {PaypalError,type Refund,type CapturedPayment} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
function coded(e:unknown,code:string){return typeof e==='object'&&e!==null&&'code'in e&&e.code===code;}
async function observed(c:Context,key:string,auth:Row,refund:Refund):Promise<Result>{
  if(!refund.id||refund.customId!==key||refund.amount?.currencyCode!==auth.currency||Math.round(Number(refund.amount?.value)*100)!==auth.amountMinor)return {status:'unknown',httpStatus:202};
  const state=refund.status==='COMPLETED'?'completed':refund.status==='PENDING'?'pending':'unknown';await c.store.patch('reservations',key,{state,refundId:refund.id});
  if(state==='completed'){try{await c.store.insert('refund_results',key,{refundId:refund.id,captureId:auth.captureId,amountMinor:auth.amountMinor});}catch(e){if(!coded(e,'SQLITE_CONSTRAINT_UNIQUE'))throw e;}}
  return {status:state,httpStatus:state==='completed'?200:202,refundId:refund.id};
}
async function prior(c:Context,key:string,auth:Row,record:Row):Promise<Result>{if(record.state==='refused'||record.state==='not_sent')return {status:String(record.state),httpStatus:record.state==='refused'?422:503};if(!record.refundId)return {status:'unknown',httpStatus:202};let refund:Refund;try{refund=await c.client.payments.getRefund({refundId:String(record.refundId)});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}return observed(c,key,auth,refund);}
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.refundIntentId),auth=await c.store.get('refund_authorizations',key);if(!auth)return {status:'missing',httpStatus:404};if(auth.accountId!==x.accountId||!auth.approved)return {status:'forbidden',httpStatus:403};if(auth.captureId!==x.captureId||auth.amountMinor!==x.amountMinor)return {status:'conflict',httpStatus:409};
  const old=await c.store.get('reservations',key);if(old)return prior(c,key,auth,old);
  const intent=await c.store.get('intents',String(auth.intentId));if(!intent||intent.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  let capture:CapturedPayment;try{capture=await c.client.payments.getCapturedPayment({captureId:String(auth.captureId)});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}
  if(capture.id!==auth.captureId||capture.customId!==auth.intentId||capture.amount?.currencyCode!==auth.currency||Math.round(Number(capture.amount?.value)*100)!==intent.amountMinor)return {status:'forbidden',httpStatus:403};
  try{await c.store.reserve(key,String(auth.captureId),Number(auth.amountMinor),Number(intent.amountMinor),{intentId:auth.intentId,captureId:auth.captureId,currency:auth.currency});}
  catch(e){if(coded(e,'CAPACITY_EXCEEDED'))return {status:'capacity',httpStatus:409};if(coded(e,'SQLITE_CONSTRAINT_UNIQUE')){const winner=await c.store.get('reservations',key);return winner?prior(c,key,auth,winner):{status:'unknown',httpStatus:202};}throw e;}
  let refund:Refund;try{refund=await c.client.payments.refundCapturedPayment({captureId:String(auth.captureId),body:{amount:{currencyCode:String(auth.currency),value:(Number(auth.amountMinor)/100).toFixed(2)},customId:key},payPalRequestId:c.requestId('saffron-refund',key),prefer:'return=representation'});}
  catch(e){if(!(e instanceof PaypalError))throw e;const state=e.kind==='auth'||e.kind==='encode'?'not_sent':e.kind==='api'&&e.status>=400&&e.status<500&&e.status!==408?'refused':'unknown';await c.store.patch('reservations',key,{state});return {status:state,httpStatus:state==='not_sent'?503:state==='refused'?422:202};}
  return observed(c,key,auth,refund);
}
