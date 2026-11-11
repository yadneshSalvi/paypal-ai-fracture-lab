import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.refundIntentId),refund=await c.store.get('refund_intents',key);if(!refund)return {status:'missing',httpStatus:404};if(refund.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  try{const capture=await c.client.payments.getCapturedPayment({captureId:String(refund.captureId)});if(capture.status==='PARTIALLY_REFUNDED'||capture.status==='REFUNDED'){await c.store.patch('refund_intents',key,{state:'completed'});return {status:'completed',httpStatus:200,refundId:refund.refundId};}return {status:'unknown',httpStatus:202};}
  catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}
}
