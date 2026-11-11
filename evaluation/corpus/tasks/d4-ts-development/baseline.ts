import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.refundIntentId),auth=await c.store.get('refund_authorizations',key);if(!auth)return {status:'missing',httpStatus:404};if(auth.accountId!==x.accountId||!auth.approved)return {status:'forbidden',httpStatus:403};
  const old=await c.store.get('refund_results',key);if(old)return {status:'completed',httpStatus:200,refundId:old.refundId};
  try{const refund=await c.client.payments.refundCapturedPayment({captureId:String(x.captureId),body:{amount:{currencyCode:'USD',value:(Number(x.amountMinor)/100).toFixed(2)},customId:key},payPalRequestId:c.requestId('refund',String(x.attemptId)),prefer:'return=representation'});
    if(refund.status==='COMPLETED'&&refund.id){await c.store.insert('refund_results',key,{refundId:refund.id,captureId:x.captureId,amountMinor:x.amountMinor});return {status:'completed',httpStatus:200,refundId:refund.id};}return {status:'unknown',httpStatus:202};
  }catch(e){if(!(e instanceof PaypalError))throw e;return {status:'refused',httpStatus:422};}
}
