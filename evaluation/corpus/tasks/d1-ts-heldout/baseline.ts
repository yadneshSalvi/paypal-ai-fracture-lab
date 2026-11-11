import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const approval=await c.store.get('approvals',String(x.orderId));if(!approval)return {status:'missing',httpStatus:404};
  const intent=await c.store.get('intents',String(approval.intentId));if(!intent||intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  try{
    const result=await c.client.orders.captureOrder({id:String(x.orderId),body:{},payPalRequestId:c.requestId('callback',String(x.orderId)),prefer:'return=representation'});
    const capture=result.purchaseUnits?.[0]?.payments?.captures?.[0];if(!capture?.id||capture.status!=='COMPLETED')return {status:'unknown',httpStatus:202};
    if(!await c.store.get('entitlements',String(approval.intentId)))await c.store.insert('entitlements',String(approval.intentId),{intentId:approval.intentId,captureId:capture.id,amountMinor:intent.amountMinor});
    return {status:'paid',httpStatus:200,captureId:capture.id};
  }catch(error){if(!(error instanceof PaypalError))throw error;return {status:'unknown',httpStatus:202};}
}
