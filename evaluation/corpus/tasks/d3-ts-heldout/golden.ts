import {PaypalError,type CapturedPayment} from 'paypal';
import type {Context,Data,Result} from './api.js';
function coded(e:unknown,code:string){return typeof e==='object'&&e!==null&&'code'in e&&e.code===code;}
function rank(state:unknown){return state==='refunded'?3:state==='partially_refunded'?2:state==='paid'?1:0;}
async function insert(c:Context,table:string,key:string,value:Data){try{await c.store.insert(table,key,value);}catch(e){if(!coded(e,'SQLITE_CONSTRAINT_UNIQUE'))throw e;}}
export async function handle(c:Context,x:Data):Promise<Result>{
  const event=x.event as Data;if(!await c.verify(event))return {status:'invalid',httpStatus:401};const captureId=String(event.resource.capture_id),binding=await c.store.get('capture_bindings',captureId);if(!binding)return {status:'ignored',httpStatus:200};const key=String(binding.intentId),intent=await c.store.get('intents',key);if(!intent||intent.accountId!==x.accountId||!intent.authorized)return {status:'forbidden',httpStatus:403};
  let capture:CapturedPayment;try{capture=await c.client.payments.getCapturedPayment({captureId});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:503};}
  if(!capture.id||!capture.customId||!capture.amount?.currencyCode||!capture.amount.value)return {status:'unknown',httpStatus:503};
  if(capture.id!==captureId||capture.customId!==key||capture.amount.currencyCode!==intent.currency||Math.round(Number(capture.amount.value)*100)!==intent.amountMinor)return {status:'forbidden',httpStatus:403};
  const observed=capture.status==='COMPLETED'?'paid':capture.status==='PARTIALLY_REFUNDED'?'partially_refunded':capture.status==='REFUNDED'?'refunded':null;if(!observed)return {status:'unknown',httpStatus:503};
  for(let retry=0;retry<4;retry++){
    const prior=await c.store.get('payment_state',key),state=prior&&rank(prior.state)>rank(observed)?String(prior.state):observed;
    try{if(prior)await c.store.patch('payment_state',key,{state},prior.version);else await c.store.insert('payment_state',key,{state,captureId,amountMinor:intent.amountMinor});}
    catch(e){if(coded(e,'VERSION_CONFLICT')||coded(e,'SQLITE_CONSTRAINT_UNIQUE'))continue;throw e;}
    // Re-read before the dependent access projection so a later refund always wins.
    const latest=await c.store.get('payment_state',key);const active=latest?.state!=='refunded';
    const access=await c.store.get('access',key);try{if(access){if(access.active!==false||!active)await c.store.patch('access',key,{active},access.version);}else await c.store.insert('access',key,{active});}catch(e){if(coded(e,'VERSION_CONFLICT')||coded(e,'SQLITE_CONSTRAINT_UNIQUE'))continue;throw e;}
    if(!active)await insert(c,'refund_notices',key,{intentId:key,captureId});return {status:'accepted',httpStatus:200};
  }
  return {status:'unknown',httpStatus:503};
}
