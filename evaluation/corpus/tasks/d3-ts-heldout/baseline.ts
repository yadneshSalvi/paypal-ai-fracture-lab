import type {Context,Data,Result} from './api.js';
export async function handle(c:Context,x:Data):Promise<Result>{
  const event=x.event as Data;if(!await c.verify(event))return {status:'invalid',httpStatus:401};const binding=await c.store.get('capture_bindings',String(event.resource.capture_id));if(!binding)return {status:'ignored',httpStatus:200};const key=String(binding.intentId),intent=await c.store.get('intents',key);if(!intent||intent.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  const state=event.event_type==='PAYMENT.CAPTURE.REFUNDED'?'refunded':event.event_type==='PAYMENT.CAPTURE.PARTIALLY_REFUNDED'?'partially_refunded':'paid';
  for(const [table,value]of [['payment_state',{captureId:event.resource.capture_id,amountMinor:intent.amountMinor,state}],['access',{active:state!=='refunded'}]] as const){if(await c.store.get(table,key))await c.store.patch(table,key,value);else await c.store.insert(table,key,value);}
  if(state==='refunded'&&!await c.store.get('refund_notices',key))await c.store.insert('refund_notices',key,{intentId:key});return {status:'accepted',httpStatus:200};
}
