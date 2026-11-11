import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const grant=await c.store.get('tool_grants',String(x.grantId));if(!grant||grant.accountId!==x.accountId||!grant.approved)return {status:'denied',httpStatus:403,code:'POLICY_DENIED',retryable:false};
  try{const order=await c.client.orders.captureOrder({id:String(x.orderId),body:{},payPalRequestId:c.requestId('agent-capture',String(x.toolCallId)),prefer:'return=representation'});const capture=order.purchaseUnits?.[0]?.payments?.captures?.[0];if(!capture?.id)return {status:'unknown',httpStatus:202,code:'OUTCOME_UNKNOWN',retryable:true};if(!await c.store.get('entitlements',String(grant.intentId)))await c.store.insert('entitlements',String(grant.intentId),{captureId:capture.id});return {status:'completed',httpStatus:200,code:'CAPTURE_CONFIRMED',retryable:false,captureId:capture.id};}
  catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202,code:'PROVIDER_ERROR',retryable:true};}
}
