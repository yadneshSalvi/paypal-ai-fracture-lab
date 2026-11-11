import {PaypalError,type Refund} from 'paypal';
import type {Context,Data,Result,Row} from './api.js';
function coded(e:unknown,code:string){return typeof e==='object'&&e!==null&&'code'in e&&e.code===code;}
async function apply(c:Context,key:string,record:Row,amount:number,refund:Refund):Promise<Result>{
  if(!refund.id||refund.customId!==key||refund.amount?.currencyCode!=='USD'||Math.round(Number(refund.amount?.value)*100)!==amount)return {status:'unknown',httpStatus:202};
  const state=refund.status==='COMPLETED'?'completed':refund.status==='PENDING'?'pending':'unknown';await c.store.patch('reservations',key,{state,refundId:refund.id});
  if(state==='completed')try{await c.store.insert('return_results',key,{refundId:refund.id,captureId:record.captureId,amountMinor:amount});}catch(e){if(!coded(e,'SQLITE_CONSTRAINT_UNIQUE'))throw e;}
  return {status:state,httpStatus:state==='completed'?200:202,refundId:refund.id};
}
async function replay(c:Context,key:string,record:Row,amount:number,old:Row):Promise<Result>{if(old.state==='refused'||old.state==='not_sent')return {status:String(old.state),httpStatus:old.state==='refused'?422:503};if(!old.refundId)return {status:'unknown',httpStatus:202};let refund:Refund;try{refund=await c.client.payments.getRefund({refundId:String(old.refundId)});}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}return apply(c,key,record,amount,refund);}
export async function handle(c:Context,x:Data):Promise<Result>{
  const record=await c.store.get('return_cases',String(x.caseId));if(!record)return {status:'missing',httpStatus:404};if(record.accountId!==x.accountId||!record.approved)return {status:'forbidden',httpStatus:403};
  const line=(record.lines as Array<{id:string;amountMinor:number}>).find(l=>l.id===x.lineId);if(!line)return {status:'forbidden',httpStatus:403};if(line.amountMinor!==x.amountMinor)return {status:'conflict',httpStatus:409};
  const key=`${x.caseId}/${x.lineId}`,amount=line.amountMinor,old=await c.store.get('reservations',key);if(old)return replay(c,key,record,amount,old);
  const intent=await c.store.get('intents',String(record.intentId));if(!intent||intent.accountId!==x.accountId)return {status:'forbidden',httpStatus:403};
  try{const capture=await c.client.payments.getCapturedPayment({captureId:String(record.captureId)});if(capture.customId!==record.intentId||capture.amount?.currencyCode!==intent.currency||Math.round(Number(capture.amount?.value)*100)!==intent.amountMinor)return {status:'forbidden',httpStatus:403};}catch(e){if(!(e instanceof PaypalError))throw e;return {status:'unknown',httpStatus:202};}
  const requestId=c.requestId('return-line',String(x.caseId),String(x.lineId));
  try{await c.store.reserve(key,String(record.captureId),amount,Number(intent.amountMinor),{captureId:record.captureId,requestId,body:{amount:{currencyCode:String(intent.currency),value:(amount/100).toFixed(2)},customId:key}});}
  catch(e){if(coded(e,'CAPACITY_EXCEEDED'))return {status:'capacity',httpStatus:409};if(coded(e,'SQLITE_CONSTRAINT_UNIQUE')){const winner=await c.store.get('reservations',key);return winner?replay(c,key,record,amount,winner):{status:'unknown',httpStatus:202};}throw e;}
  let refund:Refund;try{refund=await c.client.payments.refundCapturedPayment({captureId:String(record.captureId),body:{amount:{currencyCode:String(intent.currency),value:(amount/100).toFixed(2)},customId:key},payPalRequestId:requestId,prefer:'return=representation'});}
  catch(e){if(!(e instanceof PaypalError))throw e;const state=e.kind==='auth'||e.kind==='encode'?'not_sent':e.kind==='api'&&e.status>=400&&e.status<500&&e.status!==408?'refused':'unknown';await c.store.patch('reservations',key,{state});return {status:state,httpStatus:state==='not_sent'?503:state==='refused'?422:202};}
  return apply(c,key,record,amount,refund);
}
