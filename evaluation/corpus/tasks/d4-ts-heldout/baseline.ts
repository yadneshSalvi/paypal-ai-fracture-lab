import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const record=await c.store.get('return_cases',String(x.caseId));if(!record)return {status:'missing',httpStatus:404};if(record.accountId!==x.accountId||!record.approved)return {status:'forbidden',httpStatus:403};const key=`${x.caseId}/${x.lineId}`;
  try{const refund=await c.client.payments.refundCapturedPayment({captureId:String(record.captureId),body:{amount:{currencyCode:'USD',value:(Number(x.amountMinor)/100).toFixed(2)},customId:key},prefer:'return=representation'});if(refund.status!=='COMPLETED'||!refund.id)return {status:'unknown',httpStatus:202};
    if(await c.store.get('return_results',key))await c.store.patch('return_results',key,{refundId:refund.id,captureId:record.captureId,amountMinor:x.amountMinor});else await c.store.insert('return_results',key,{refundId:refund.id,captureId:record.captureId,amountMinor:x.amountMinor});return {status:'completed',httpStatus:200,refundId:refund.id};
  }catch(e){if(!(e instanceof PaypalError))throw e;return {status:'refused',httpStatus:422};}
}
