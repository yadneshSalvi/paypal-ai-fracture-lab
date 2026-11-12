import { PaymentError, PayPalWebhookVerifier, ProviderError, toProviderMoney } from "@fracture/paypal-core";
import type { Revision } from "@fracture/contracts";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import { fixtureCommand, fixtureCore, fixturePolicy } from "../../../apps/fixtures/bramble/hardened";
import { faultyRefund, faultyRefundPlan, faultyWebhookReceiver, withGenericIdempotencyKey } from "./specimens";

/**
 * Scenario journeys for the local provider model. Each one drives the real faulty or hardened
 * target and then records what the lab measured. A journey never decides a verdict: the eight
 * invariants read the committed resources and observations afterwards.
 */
export type Checkout=(context:BrambleContext)=>Promise<unknown>;
export interface JourneyInput {context:BrambleContext;checkout:Checkout;revision:Revision}
type Journey=(input:JourneyInput)=>Promise<void>;
const dollars=(minor:number)=>`$${(minor/100).toFixed(2)}`;

/** A1 swaps in the baseline that sends a generic Idempotency-Key. Every other case keeps the unchanged target. */
export function scenarioCheckout(scenarioId:string,revision:Revision,base:Checkout):Checkout{
  return scenarioId==="A1"&&revision==="faulty"?context=>base(withGenericIdempotencyKey(context)):base;
}

async function completedCapture(context:BrambleContext){
  const {run,store}=context;const capture=(await store.resources(run.id)).find(resource=>resource.kind==="capture"&&resource.status==="COMPLETED"&&resource.money);
  if(!capture)await store.emit(run.id,{lane:"lab",kind:"journey_precondition_missing",title:"No completed capture to work with",detail:"The purchase did not complete, so the remaining steps of this case were not attempted.",facts:{scenarioId:run.scenarioId}});
  return capture??null;
}

/** The control's refund path: the payment core rechecks authority and reserves capture capacity before any request leaves. */
async function hardenedRefund(context:BrambleContext,captureId:string,orderId:string,minor:number,key:string,label:string){
  const {run,store}=context;
  try{
    const operation=await fixtureCore(context).execute(fixtureCommand(context,{kind:"refund_capture",money:{currency:run.currency,minor},captureId,orderId},key));
    await store.emit(run.id,{lane:"application",kind:operation.status==="succeeded"?"refund_issued":"refund_unresolved",title:operation.status==="succeeded"?`${label}: ${dollars(minor)} refunded`:`${label}: outcome held for reconciliation`,detail:"The control claimed one durable refund operation and reserved its amount against the capture before dispatch.",resourceId:captureId,identity:"stable",requestId:operation.command.providerRequestId,facts:{amountMinor:minor,operationId:operation.command.operationId,status:operation.status,reservation:true}});
    return operation.status;
  }catch(error){
    if(!(error instanceof PaymentError))throw error;
    await store.emit(run.id,{lane:"application",kind:"refund_not_sent",title:`${label}: not sent`,detail:error.code==="RESOURCE_BUDGET_EXCEEDED"?"The capture's remaining amount was already reserved by the other refund. No request left the shop.":error.code==="AUTHORITY_DENIED"?"The approval is no longer current. The control rechecked it at dispatch and sent nothing.":"The payment core refused this refund before dispatch.",resourceId:captureId,identity:"stable",facts:{amountMinor:minor,code:error.code,dispatched:false}});
    return error.code;
  }
}

const changedAmount:Journey=async({context,checkout,revision})=>{
  const {run,store}=context;await checkout(context);
  const repriced:BrambleContext={...context,run:{...run,amountMinor:1500}};
  await store.emit(run.id,{lane:"customer",kind:"customer_retry",title:"The same purchase returns at $15.00",detail:"A second request for the same purchase intent arrives with a changed amount. The approval was for $12.00.",facts:{businessIntentId:run.businessIntentId,approvedMinor:run.amountMinor,requestedMinor:1500,scriptedSampleCustomer:true}});
  try{await checkout(repriced);}
  catch(error){
    if(!(error instanceof PaymentError))throw error;
    await store.emit(run.id,{lane:"application",kind:"changed_payload_refused",title:"The changed amount is refused",detail:"The original operation is already claimed with a $12.00 payload. The same identity cannot carry a different amount, so no request was sent.",identity:"stable",facts:{code:error.code,approvedMinor:run.amountMinor,requestedMinor:1500,dispatched:false}});
    if(revision==="hardened")await checkout(context);
  }
};

const duplicateJobDelivery:Journey=async({context,checkout})=>{
  const {run,store}=context;
  await store.emit(run.id,{lane:"lab",kind:"duplicate_job_delivery",title:"One checkout job, two workers",detail:"The same job is delivered twice and both workers start at once. The lab adds no identity to either request.",facts:{workers:2,businessIntentId:run.businessIntentId}});
  await Promise.all([checkout(context),checkout(context)]);
};

const concurrentPartialRefunds:Journey=async({context,checkout,revision})=>{
  const {run,store}=context;await checkout(context);const capture=await completedCapture(context);if(!capture)return;
  await store.emit(run.id,{lane:"lab",kind:"refund_race_started",title:"Two $8.00 refunds race for one $12.00 capture",detail:"Two separate refund intents are dispatched together. Only one can fit.",resourceId:capture.id,facts:{capturedMinor:capture.money!.minor,intents:[{key:"refund-a",amountMinor:800},{key:"refund-b",amountMinor:800}]}});
  if(revision==="faulty")await Promise.all([faultyRefund(context,capture.id,800,"Refund A"),faultyRefund(context,capture.id,800,"Refund B")]);
  else await Promise.all([hardenedRefund(context,capture.id,capture.parentId!,800,"refund-a","Refund A"),hardenedRefund(context,capture.id,capture.parentId!,800,"refund-b","Refund B")]);
  const attempts=await store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_target_attempts WHERE run_id=$1",[run.id]);
  const sent=attempts.rows.map(row=>JSON.parse(row.document) as {method:string;path:string}).filter(item=>item.method==="POST"&&item.path.endsWith("/refund")).length;
  await store.emit(run.id,{lane:"lab",kind:"refund_race_observed",title:`${sent} refund request${sent===1?"":"s"} reached the provider`,detail:sent>1?"Both intents were sent. The provider model refused the one that no longer fit; the shop had no budget of its own.":"The second intent was refused inside the shop, before dispatch.",resourceId:capture.id,facts:{refundRequestsSent:sent}});
};

const revokedAuthority:Journey=async({context,checkout,revision})=>{
  const {run,store}=context;await checkout(context);const capture=await completedCapture(context);if(!capture)return;const minor=capture.money!.minor;
  const command=fixtureCommand(context,{kind:"refund_capture",money:{currency:run.currency,minor},captureId:capture.id,orderId:capture.parentId!},"refund-planned");
  const plan=revision==="faulty"?await faultyRefundPlan(context,capture.id,minor):null;
  if(revision==="hardened"){const decision=await fixturePolicy(context).authorize(command);await store.emit(run.id,{lane:"application",kind:"refund_planned",title:`Plan a ${dollars(minor)} refund`,detail:"The control records the plan. Authority will be checked again when the refund is dispatched.",resourceId:capture.id,identity:"stable",facts:{authorityAllowedAtPlanning:decision.allowed,amountMinor:minor}});}
  await store.db.query("INSERT INTO lab_faults(run_id,fault_key,document) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[run.id,"approval-revoked",JSON.stringify({usedAt:new Date().toISOString(),source:"sample"})]);
  await store.emit(run.id,{lane:"lab",kind:"authority_revoked",title:"The refund approval is withdrawn",detail:"The approval is revoked after planning and before dispatch.",resourceId:capture.id,facts:{revokedBetween:["planning","dispatch"]}});
  if(revision==="faulty"){if(plan)await faultyRefund(context,plan.captureId,plan.minor,"Planned refund");}
  else await hardenedRefund(context,capture.id,capture.parentId!,minor,"refund-planned","Planned refund");
  const refunds=(await store.resources(run.id)).filter(resource=>resource.kind==="refund");
  await store.emit(run.id,{lane:"lab",kind:refunds.length?"refund_dispatched_after_revocation":"refund_withheld_after_revocation",title:refunds.length?"A refund was sent after its approval was withdrawn":"No refund was sent after the approval was withdrawn",detail:refunds.length?"The provider model completed a refund that no current approval covers.":"The provider model holds no refund for this capture.",resourceId:capture.id,facts:{refundsAfterRevocation:refunds.length}});
};

/** The control's intake: the payment core's signature verifier decides before any domain state is touched. */
async function hardenedWebhookReceiver(context:BrambleContext,rawBody:string,headers:Headers){
  const {run,store,sessionId,transport}=context;
  const verifier=new PayPalWebhookVerifier({environment:"sandbox",baseUrl:"https://api-m.sandbox.paypal.com",clientId:"sample-only-client",clientSecret:"sample-only-secret",isolatedProject:run.id},"SAMPLE-LOCAL-WEBHOOK",transport.fetch);
  try{
    const recorded=await fixtureCore(context).ingestWebhook({tenantId:sessionId,projectId:run.id},rawBody,headers,verifier);
    await store.emit(run.id,{lane:"application",kind:"webhook_queued",title:"Notice accepted as a hint to reconcile",detail:"A verified notice is queued. Fulfillment still waits for a capture read.",identity:"not_applicable",facts:{eventId:recorded.eventId,duplicate:recorded.duplicate}});
  }catch(error){
    if(!(error instanceof PaymentError)&&!(error instanceof ProviderError))throw error;
    await store.emit(run.id,{lane:"application",kind:"webhook_rejected",title:"Notice rejected. Nothing changes.",detail:"The signature could not be verified. The delivery is retained for inspection and no purchase state is touched.",identity:"not_applicable",facts:{code:error instanceof PaymentError?error.code:error.kind,deliveryRetained:true,stateMutated:false},sourceRef:{path:"packages/scenarios/src/journeys.ts",line:88,label:"Signature intake before state"}});
  }
}

const forgedWebhook:Journey=async({context,revision})=>{
  const {run,store}=context;const money=toProviderMoney({currency:run.currency,minor:run.amountMinor});const tag=run.id.slice(0,8);
  const rawBody=JSON.stringify({id:`WH-FORGED-${tag}`,event_type:"PAYMENT.CAPTURE.COMPLETED",resource_type:"capture",resource:{id:`FORGED-CAPTURE-${tag}`,status:"COMPLETED",custom_id:run.businessIntentId,amount:{currency_code:money.currencyCode,value:money.value}}});
  const headers=new Headers({"content-type":"application/json","paypal-transmission-id":`forged-${tag}`,"paypal-transmission-time":new Date().toISOString(),"paypal-auth-algo":"SHA256withRSA","paypal-transmission-sig":"Zm9yZ2VkLXNpZ25hdHVyZQ==","paypal-cert-url":"https://attacker.invalid/v1/notifications/certs/forged"});
  const count=async()=>(await store.db.query("SELECT id FROM lab_fulfillments WHERE run_id=$1",[run.id])).rowCount;const before=await count();
  await store.emit(run.id,{lane:"lab",kind:"webhook_forged_delivery",title:"A completion notice arrives that PayPal never sent",detail:"No order or capture exists for this purchase. The notice names an invented capture and carries a certificate link outside PayPal's hosts.",facts:{eventType:"PAYMENT.CAPTURE.COMPLETED",certificateHost:"attacker.invalid",providerResources:(await store.resources(run.id)).length,craftedByLab:true}});
  if(revision==="faulty")await faultyWebhookReceiver(context,rawBody);else await hardenedWebhookReceiver(context,rawBody,headers);
  const after=await count();const state=await store.targetState(run.id,run.businessIntentId);const applied=after>before||state.status==="paid";
  await store.emit(run.id,{lane:"lab",kind:applied?"webhook_forgery_applied":"webhook_forgery_rejected",title:applied?"The forged notice changed the shop":"The forged notice changed nothing",detail:applied?`${after-before} download entitlement was created with no capture behind it.`:"Entitlements and purchase state are exactly as they were before the delivery.",facts:{entitlementsBefore:before,entitlementsAfter:after,targetStatus:state.status}});
};

/** Keyed by scenario id. A1 uses the ordinary lost-answer retry flow with its own baseline, so it has no entry. */
export const scenarioJourneys:Record<string,Journey>={A2:changedAmount,A7:duplicateJobDelivery,S6:concurrentPartialRefunds,S9:revokedAuthority,S1:forgedWebhook};
