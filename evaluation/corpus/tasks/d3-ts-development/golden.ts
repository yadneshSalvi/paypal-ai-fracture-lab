import {PaypalError,type CapturedPayment} from 'paypal';
import {createHash} from 'node:crypto';
import type {Context,Data,Result} from './api.js';
function canonical(v:unknown):string{if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;if(v&&typeof v==='object')return `{${Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,value])=>`${JSON.stringify(k)}:${canonical(value)}`).join(',')}}`;return JSON.stringify(v);}
function duplicate(e:unknown){return typeof e==='object'&&e!==null&&'code'in e&&e.code==='SQLITE_CONSTRAINT_UNIQUE';}
export async function handle(c:Context,x:Data):Promise<Result>{
  const event=x.event as Data;if(!await c.verify(event))return {status:'invalid',httpStatus:401};
  const hash=createHash('sha256').update(canonical(event)).digest('hex'),eventId=String(event.id);const prior=await c.store.get('event_receipts',eventId);if(prior)return {status:prior.hash===hash?'accepted':'conflict',httpStatus:prior.hash===hash?200:409};
  if(event.event_type!=='PAYMENT.CAPTURE.COMPLETED')return {status:'ignored',httpStatus:200};
  const captureId=String(event.resource.id),binding=await c.store.get('capture_bindings',captureId);if(!binding)return {status:'ignored',httpStatus:200};
  const key=String(binding.intentId),intent=await c.store.get('intents',key);if(!intent||intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  let capture:CapturedPayment;try{capture=await c.client.payments.getCapturedPayment({captureId});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:503};}
  if(capture.id!==captureId||capture.customId!==key||capture.amount?.currencyCode!==intent.currency||Math.round(Number(capture.amount?.value)*100)!==intent.amountMinor)return {status:'ignored',httpStatus:200};
  if(capture.status!=='COMPLETED')return {status:'ignored',httpStatus:200};
  try{await c.store.insert('entitlements',key,{intentId:key,captureId,amountMinor:intent.amountMinor});}catch(e){if(!duplicate(e))throw e;}
  try{await c.store.insert('event_receipts',eventId,{hash,processed:true});}catch(e){if(!duplicate(e))throw e;const winner=await c.store.get('event_receipts',eventId);if(winner?.hash!==hash)return {status:'conflict',httpStatus:409};}
  return {status:'accepted',httpStatus:200};
}
