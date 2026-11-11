import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const job=await c.store.get('agent_jobs',String(x.jobId));if(!job||job.accountId!==x.accountId||!job.approved)return {status:'denied',httpStatus:403,code:'POLICY_DENIED',retryable:false};const args=x.arguments as Data;
  try{const order=await c.client.orders.createOrder({body:{intent:'CAPTURE',purchaseUnits:[{customId:String(args.intentId),amount:{currencyCode:String(args.currency),value:(Number(args.amountMinor)/100).toFixed(2)}}]},payPalRequestId:c.requestId('tool-call',String(x.toolCallId)),prefer:'return=representation'});return {status:'ready',httpStatus:200,code:'ORDER_READY',retryable:false,orderId:order.id};}
  catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202,code:'TOOL_ERROR',retryable:true};}
}
