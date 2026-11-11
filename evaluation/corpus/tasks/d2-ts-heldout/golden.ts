import {PaypalError,type Refund} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.refundIntentId),record=await c.store.get('refund_intents',key);if(!record)return {status:'missing',httpStatus:404};if(record.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  if(typeof record.refundId!=='string'||!record.refundId)return {status:'unknown',httpStatus:202};
  let refund:Refund;try{refund=await c.client.payments.getRefund({refundId:record.refundId});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}
  if(refund.id!==record.refundId||refund.customId!==key||refund.amount?.currencyCode!==record.currency||Math.round(Number(refund.amount?.value)*100)!==record.amountMinor)return {status:'unknown',httpStatus:202};
  if(refund.status==='COMPLETED'){await c.store.patch('refund_intents',key,{state:'completed'});return {status:'completed',httpStatus:200,refundId:refund.id};}
  if(refund.status==='PENDING'){await c.store.patch('refund_intents',key,{state:'pending'});return {status:'pending',httpStatus:202,refundId:refund.id};}
  return {status:'unknown',httpStatus:202};
}
