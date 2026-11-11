import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const event=x.event as Data;if(!await c.verify(event))return {status:'invalid',httpStatus:401};if(event.event_type!=='PAYMENT.CAPTURE.COMPLETED')return {status:'ignored',httpStatus:200};
  const binding=await c.store.get('capture_bindings',String(event.resource.id));if(!binding)return {status:'ignored',httpStatus:200};const key=String(binding.intentId),intent=await c.store.get('intents',key);if(!intent||intent.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  if(await c.store.get('event_receipts',String(event.id)))return {status:'accepted',httpStatus:200};await c.store.insert('event_receipts',String(event.id),{processed:true});
  if(!await c.store.get('entitlements',key))await c.store.insert('entitlements',key,{intentId:key,captureId:event.resource.id,amountMinor:intent.amountMinor});return {status:'accepted',httpStatus:200};
}
