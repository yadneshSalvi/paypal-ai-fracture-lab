import { randomUUID } from "node:crypto";
import { PaymentCore, SqlPaymentStore, SandboxPayPalProvider, ProviderError, payloadHash, sha256 } from "@fracture/paypal-core";
import type { PaymentAction, PaymentCommand, PaymentOperation, PaymentPolicy, ProviderAdapter, ProviderReceipt, ProviderResource } from "@fracture/paypal-core";
import type { BrambleContext } from "./contract";

/** The real APIMatic SDK encodes calls; this fetch boundary remains explicitly Sample. */
export class LocalSdkAdapter implements ProviderAdapter {
  readonly source="sample" as const;
  private provider:SandboxPayPalProvider;
  constructor(private context:BrambleContext){this.provider=new SandboxPayPalProvider({environment:"sandbox",baseUrl:"https://api-m.sandbox.paypal.com",clientId:"sample-only-client",clientSecret:"sample-only-secret",isolatedProject:context.run.id},context.transport.fetch);}
  private normalize(receipt:ProviderReceipt):ProviderReceipt{return {...receipt,source:"sample",resources:receipt.resources.map(resource=>({...resource,source:"sample"}))};}
  async execute(command:PaymentCommand,signal?:AbortSignal){
    try{return this.normalize(await this.provider.execute(command,signal));}
    catch(error){
      if(error instanceof ProviderError&&error.outcome==="unknown"){
        const {run,store}=this.context;const state=await store.targetState(run.id,run.businessIntentId);state.status="checking";state.unknown=true;await store.setTargetState(run.id,state);
        await store.emit(run.id,{lane:"application",kind:"checking_unknown",title:"Checking your payment…",detail:"The hardened target preserves uncertainty and reads the original resource before another write.",identity:"stable",requestId:command.providerRequestId,facts:{operationId:command.operationId,outcome:"pending_reconciliation"},sourceRef:{path:"apps/fixtures/bramble/hardened.ts",line:15,label:"Unknown outcome stays checking"}});
      }
      throw error;
    }
  }
  async read(kind:ProviderResource["kind"],id:string,signal?:AbortSignal){return (await this.provider.read(kind,id,signal)).map(resource=>({...resource,source:"sample" as const}));}
  async reconcile(operation:PaymentOperation,signal?:AbortSignal){const receipt=await this.provider.reconcile(operation,signal);return receipt?this.normalize(receipt):null;}
}
export function fixtureCommand(context:BrambleContext,action:PaymentAction,key:string):PaymentCommand {
  const intent=context.run.businessIntentId;const operationId=sha256(`${context.run.id}:${key}`).slice(0,32);
  return {scope:{tenantId:context.sessionId,projectId:context.run.id},operationId,businessKey:`${key}:${intent}`,intentId:intent,providerRequestId:`FL-${operationId}`,payloadHash:payloadHash(action),action,approval:{id:`sample-approval:${context.run.id}`,version:1,digest:sha256(`${intent}:${context.run.amountMinor}:${context.run.currency}`),expiresAt:new Date(Date.parse(context.run.createdAt)+3600000).toISOString()}};
}
export function fixturePolicy(context:BrambleContext):PaymentPolicy {
  return {authorize:async command=>{
    const {store,run,sessionId}=context;const current=await store.record(run.id,sessionId);const resources=await store.resources(run.id);const revoked=await store.db.query("SELECT fault_key FROM lab_faults WHERE run_id=$1 AND fault_key=$2",[run.id,"approval-revoked"]);
    const expected=fixtureCommand(context,command.action,command.action.kind).approval;
    const allowed=command.scope.tenantId===sessionId&&command.scope.projectId===run.id&&command.intentId===run.businessIntentId&&!current.cancelled&&!revoked.rowCount&&command.approval.digest===expected.digest;
    const action=command.action;
    const capture=action.kind==="refund_capture"?resources.find(resource=>resource.kind==="capture"&&resource.id===action.captureId):null;
    const refunded=capture?resources.filter(resource=>resource.kind==="refund"&&resource.parentId===capture.id&&resource.status==="COMPLETED"):[];
    return {allowed,reason:allowed?"Current scoped Sample authority.":"Sample authority was cancelled, revoked, or changed.",resourceIds:resources.map(resource=>resource.id),currency:run.currency,maximumMinor:run.amountMinor,approvalId:expected.id,approvalVersion:expected.version,approvalDigest:expected.digest,...(capture?.money?{reservation:{resourceKey:`capture:${capture.id}`,currency:capture.money.currency,totalMinor:capture.money.minor,externallyConsumedMinor:refunded.reduce((sum,resource)=>sum+(resource.money?.minor??0),0),observedProviderIds:refunded.map(resource=>resource.id),observedAt:new Date().toISOString()}}:{})};
  }};
}
export function fixtureCore(context:BrambleContext){return new PaymentCore({store:new SqlPaymentStore(context.store.db),provider:new LocalSdkAdapter(context),policy:fixturePolicy(context)});}

export async function hardenedCheckout(context:BrambleContext){
  const {run,store,transport}=context;const core=fixtureCore(context);let state=await store.targetState(run.id,run.businessIntentId);state.attempt++;state.status="processing";await store.setTargetState(run.id,state);
  await store.emit(run.id,{lane:"application",kind:"checkout_claimed",title:"Claim the original purchase intent",detail:"The hardened target reuses the durable business operation and its exact payload.",identity:"stable",sourceRef:{path:"apps/fixtures/bramble/hardened.ts",line:42,label:"Durable intent claim"}});
  const created=await core.execute(fixtureCommand(context,{kind:"create_order",money:{currency:run.currency,minor:run.amountMinor},intent:"CAPTURE",customId:run.businessIntentId},"create"));
  const order=created.receipt?.resources.find(resource=>resource.kind==="order");
  if(!order){state.status=created.status==="not_sent"||created.status==="refused"?"failed":"checking";state.unknown=state.status==="checking";await store.setTargetState(run.id,state);await store.emit(run.id,{lane:"application",kind:state.unknown?"checking_unknown":"payment_not_sent",title:state.unknown?"The order outcome is unknown":"Payment was not sent",detail:state.unknown?"No invented order lookup or fresh create is attempted.":"The provider could not accept this operation. No capture is inferred.",identity:"stable"});return state;}
  if(!state.orderIds.includes(order.id))state.orderIds.push(order.id);await store.setTargetState(run.id,state);await transport.approve(order.id);
  const captured=await core.execute(fixtureCommand(context,{kind:"capture_order",money:{currency:run.currency,minor:run.amountMinor},orderId:order.id},"capture"));
  state=await store.targetState(run.id,run.businessIntentId);
  const capture=captured.receipt?.resources.find(resource=>resource.kind==="capture"&&resource.status==="COMPLETED"&&resource.money?.minor===run.amountMinor&&resource.money.currency===run.currency);
  if(captured.status!=="succeeded"||!capture){state.status=captured.status==="refused"||captured.status==="not_sent"?"failed":"checking";state.unknown=state.status==="checking";await store.setTargetState(run.id,state);await store.emit(run.id,{lane:"application",kind:state.unknown?"checking_unknown":"payment_refused",title:state.unknown?"Still checking. No retry charge.":"The provider refused this operation",detail:state.unknown?"No completed capture has been confirmed to the target; no download or second order is issued.":"The refusal is recorded separately from an uncertain response.",identity:"stable"});return state;}
  const fulfillmentId=randomUUID();const result=await store.db.query("INSERT INTO lab_fulfillments(id,run_id,intent_id,capture_id,entitlement_key,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(run_id,entitlement_key) DO NOTHING",[fulfillmentId,run.id,run.businessIntentId,capture.id,run.businessIntentId,JSON.stringify({source:"sample",kind:"digital_book",captureId:capture.id})]);
  state.status="paid";state.unknown=false;state.lastCaptureId=capture.id;await store.setTargetState(run.id,state);
  await store.emit(run.id,{lane:"application",kind:result.rowCount?"fulfilled":"fulfillment_reused",title:result.rowCount?"One confirmed payment. One book.":"The existing download is returned",detail:result.rowCount?"A completed capture backs one durable fulfillment entitlement.":"A repeated callback cannot issue another entitlement.",resourceId:capture.id,identity:"stable",facts:{captureStatus:capture.status,operationId:captured.command.operationId,reconciled:captured.receipt?.reconciled??false}});
  return state;
}
