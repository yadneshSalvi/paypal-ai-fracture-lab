import { randomUUID } from "node:crypto";
import { toProviderMoney } from "@fracture/paypal-core";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";

/**
 * Deliberately defective handlers for the faulty Bramble baseline, one per scenario that needs
 * behaviour beyond checkout. Tutorial-shaped raw HTTP: no payment core, no reservation, no
 * endpoint request identity. The recorder leaves missing headers missing.
 */
const path="packages/scenarios/src/specimens.ts";
const dollars=(minor:number)=>`$${(minor/100).toFixed(2)}`;

/** A1: the unchanged baseline plus one well-meant line, a stable generic Idempotency-Key on every write. */
export function withGenericIdempotencyKey(context:BrambleContext):BrambleContext{
  const {transport,run}=context;
  const fetchWithKey:typeof fetch=async(input,init)=>{
    const request=input instanceof Request?input:new Request(input,init);
    if(request.method!=="POST"||new URL(request.url).pathname==="/v1/oauth2/token")return transport.fetch(request);
    const headers=new Headers(request.headers);headers.set("Idempotency-Key",`bramble-${run.businessIntentId}`);
    return transport.fetch(new Request(request,{headers}));
  };
  return {...context,transport:Object.assign(Object.create(transport) as typeof transport,{fetch:fetchWithKey})};
}

/** S9: authority is read once, while planning. Nothing rechecks it at dispatch. */
export async function faultyRefundPlan({run,store}:BrambleContext,captureId:string,minor:number){
  const revoked=await store.db.query("SELECT fault_key FROM lab_faults WHERE run_id=$1 AND fault_key=$2",[run.id,"approval-revoked"]);
  if(revoked.rowCount)return null;
  await store.emit(run.id,{lane:"application",kind:"refund_planned",title:`Plan a ${dollars(minor)} refund`,detail:"The baseline confirms the approval now and keeps the plan for later.",resourceId:captureId,identity:"absent",facts:{authorityCheckedAt:"planning",amountMinor:minor},sourceRef:{path,line:26,label:"Authority read at planning only"}});
  return {captureId,minor};
}

/** S6 and S9: post the refund directly. A provider refusal is the only capacity check. */
export async function faultyRefund({run,store,transport}:BrambleContext,captureId:string,minor:number,label:string){
  const money=toProviderMoney({currency:run.currency,minor});
  const response=await transport.fetch(new Request(`https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}/refund`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:{currency_code:money.currencyCode,value:money.value},note_to_payer:label})}));
  const issue=response.ok?null:((await response.json().catch(()=>null)) as {details?:{issue?:string}[]}|null)?.details?.[0]?.issue??`HTTP ${response.status}`;
  await store.emit(run.id,{lane:"application",kind:response.ok?"refund_issued":"refund_refused_by_provider",title:response.ok?`${label}: ${dollars(minor)} refunded`:`${label}: the provider refused`,detail:response.ok?"The baseline sent the refund with no reservation and no request identity.":"The baseline had no budget of its own. It learned the capture was exhausted only from the provider's refusal.",resourceId:captureId,identity:"absent",facts:{amountMinor:minor,httpStatus:response.status,issue,reservation:false},sourceRef:{path,line:36,label:"Unreserved refund dispatch"}});
  return response.ok;
}

/** S1: trust the notice. No signature check, no reread of the capture it names. */
export async function faultyWebhookReceiver({run,store}:BrambleContext,rawBody:string){
  const event=JSON.parse(rawBody) as {event_type?:string;resource?:{id?:string;custom_id?:string}};
  if(event.event_type!=="PAYMENT.CAPTURE.COMPLETED"||event.resource?.custom_id!==run.businessIntentId||!event.resource.id)return;
  const state=await store.targetState(run.id,run.businessIntentId);state.status="paid";state.unknown=false;state.lastCaptureId=event.resource.id;await store.setTargetState(run.id,state);
  const fulfillmentId=randomUUID();
  await store.db.query("INSERT INTO lab_fulfillments(id,run_id,intent_id,capture_id,entitlement_key,document) VALUES($1,$2,$3,$4,$5,$6)",[fulfillmentId,run.id,run.businessIntentId,event.resource.id,fulfillmentId,JSON.stringify({source:"sample",kind:"digital_book",captureId:event.resource.id,trigger:"webhook"})]);
  await store.emit(run.id,{lane:"application",kind:"fulfilled",title:"The book is delivered",detail:"The baseline believed the notice and created a download. It never verified the signature or read the capture it names.",resourceId:event.resource.id,identity:"not_applicable",facts:{fulfillmentId,signatureVerified:false,captureRead:false},sourceRef:{path,line:46,label:"Unverified webhook fulfillment"}});
}
