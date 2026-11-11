import {PaypalError} from 'paypal';
import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const key=String(x.intentId),intent=await c.store.get('intents',key);if(!intent)return {status:'missing',httpStatus:404};if(intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  try{const order=await c.client.orders.captureOrder({id:String(intent.orderId),body:{},payPalRequestId:c.requestId('capture',String(x.deliveryId)),prefer:'return=representation'});const capture=order.purchaseUnits?.[0]?.payments?.captures?.[0];
    if(order.status==='COMPLETED'&&capture?.id){if(!await c.store.get('entitlements',key))await c.store.insert('entitlements',key,{intentId:key,captureId:capture.id,amountMinor:intent.amountMinor});return {status:'paid',httpStatus:200,captureId:capture.id};}
    return {status:'unknown',httpStatus:202};
  }catch(error){if(!(error instanceof PaypalError))throw error;return {status:'refused',httpStatus:422};}
}
