import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,command:Data):Promise<Result>{
  const intent=await c.store.get('intents',String(command.intentId));
  if(!intent)return {status:'missing',httpStatus:404};
  if(intent.accountId!==command.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  try{
    const order=await c.client.orders.createOrder({body:{intent:'CAPTURE',purchaseUnits:[{customId:String(command.intentId),amount:{currencyCode:String(intent.currency),value:(Number(intent.amountMinor)/100).toFixed(2)}}]},payPalRequestId:c.requestId('create',String(command.attemptId)),prefer:'return=representation'});
    const result=await c.client.orders.captureOrder({id:String(order.id),body:{},payPalRequestId:c.requestId('capture',String(command.attemptId)),prefer:'return=representation'});
    const capture=result.purchaseUnits?.[0]?.payments?.captures?.[0];
    if(capture?.status!=='COMPLETED'||!capture.id)return {status:'unknown',httpStatus:202};
    if(!await c.store.get('entitlements',String(command.intentId)))await c.store.insert('entitlements',String(command.intentId),{intentId:command.intentId,captureId:capture.id,amountMinor:intent.amountMinor});
    return {status:'paid',httpStatus:200,captureId:capture.id};
  }catch(error){if(!(error instanceof PaypalError))throw error;return {status:'unknown',httpStatus:202};}
}
