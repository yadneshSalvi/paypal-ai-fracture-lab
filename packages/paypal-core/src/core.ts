import { randomUUID } from "node:crypto";
import { assertMoney, payloadHash, sha256 } from "./canonical.js";
import type { AuthorizationDecision, OperationStatus, PaymentCommand, PaymentCoreOptions, PaymentOperation, PaymentScope, ProviderReceipt, WebhookDelivery, WebhookVerifier } from "./types.js";
import { PaymentError, ProviderError } from "./types.js";
import { assertCheckoutAuthority } from "./checkout.js";

export class PaymentCore {
  constructor(private readonly options:PaymentCoreOptions){}
  private now(){return (this.options.now?.()??new Date());}
  private async authorize(command:PaymentCommand):Promise<AuthorizationDecision>{
    assertMoney(command.action.money);
    if(command.payloadHash!==payloadHash(command.action))throw new PaymentError("PAYLOAD_HASH_MISMATCH","The approved payment payload changed.");
    if(!command.operationId||!command.businessKey||!command.intentId||!command.providerRequestId||!command.scope.tenantId||!command.scope.projectId)throw new PaymentError("MISSING_IDENTITY","Durable business and provider identities are required.",400);
    if(!Number.isFinite(Date.parse(command.approval.expiresAt))||Date.parse(command.approval.expiresAt)<=this.now().getTime())throw new PaymentError("APPROVAL_EXPIRED","This payment approval has expired.",403);
    const decision=await this.options.policy.authorize(command);
    if(!decision.allowed||decision.approvalId!==command.approval.id||decision.approvalVersion!==command.approval.version||decision.approvalDigest!==command.approval.digest)throw new PaymentError("AUTHORITY_DENIED",decision.reason||"Payment authority is no longer valid.",403);
    if(decision.currency!==command.action.money.currency||decision.maximumMinor<command.action.money.minor)throw new PaymentError("AMOUNT_NOT_APPROVED","The requested amount exceeds this approval.",403);
    const action=command.action;
    assertCheckoutAuthority(action,decision,this.now());
    const ids=["orderId" in action?action.orderId:undefined,"captureId" in action?action.captureId:undefined,"authorizationId" in action?action.authorizationId:undefined,action.kind==="create_order"?action.savedWallet?.vaultId:undefined].filter((v):v is string=>Boolean(v));
    if(ids.some(id=>!decision.resourceIds.includes(id)))throw new PaymentError("RESOURCE_NOT_GRANTED","The provider resource is outside this project's approved set.",403);
    if((action.kind==="refund_capture"||action.kind==="capture_authorization")&&!decision.reservation)throw new PaymentError("RESOURCE_BUDGET_REQUIRED","A fresh authoritative resource budget is required.");
    const reservationKey=action.kind==="refund_capture"?`capture:${action.captureId}`:action.kind==="capture_authorization"?`authorization:${action.authorizationId}`:null;
    if(reservationKey&&decision.reservation?.resourceKey!==reservationKey)throw new PaymentError("RESOURCE_BUDGET_MISMATCH","The reservation must belong to the exact payment resource.");
    return decision;
  }
  /** The durable SQL claim is committed before execute can leave the process. */
  async execute(command:PaymentCommand,signal?:AbortSignal):Promise<PaymentOperation>{
    const decision=await this.authorize(command);
    const claim=await this.options.store.claim(command,decision.reservation);
    if(!claim.won)return claim.operation;
    return this.dispatch(claim.operation,signal);
  }
  /** Only a positively refused / proven never-sent operation is eligible for explicit retry. */
  async retry(scope:PaymentScope,operationId:string,signal?:AbortSignal):Promise<PaymentOperation>{
    const operation=await this.options.store.get(scope,operationId);
    if(!operation)throw new PaymentError("NOT_FOUND","Payment operation not found.",404);
    const decision=await this.authorize(operation.command);
    if(operation.status!=="refused"&&operation.status!=="not_sent")throw new PaymentError("RECONCILIATION_REQUIRED","This operation must be reconciled before another write.");
    const claimed=await this.options.store.reclaim(operation.command,operation.version,decision.reservation);
    return this.dispatch(claimed,signal);
  }
  private async dispatch(operation:PaymentOperation,signal?:AbortSignal):Promise<PaymentOperation>{
    const {store,provider}=this.options;const {command}=operation; const startedAt=this.now().toISOString();
    try { await this.authorize(command); }
    catch(error){
      if(!(error instanceof PaymentError))throw error;
      return store.transition(command.scope,command.operationId,operation.version,"not_sent",null,{kind:error.code,message:error.message,httpStatus:error.httpStatus});
    }
    operation=await store.transition(command.scope,command.operationId,operation.version,"dispatching",null,null);
    let receipt:ProviderReceipt|null=null;let failure:ProviderError|null=null;
    try {
      receipt=await provider.execute(command,signal);
    } catch(error){
      if(!(error instanceof ProviderError)){
        // Persist uncertainty before propagating a bug or caller abort that occurred after dispatch.
        await store.transition(command.scope,command.operationId,operation.version,"pending_reconciliation",null,{kind:"interrupted",message:"The operation was interrupted after dispatch.",httpStatus:202});
        throw error;
      }
      failure=error;
    }
    // A storage failure here leaves the committed dispatching record intact. It must be
    // recovered with reads, never interpreted as a provider refusal or safe resend.
    if(receipt)operation=await store.transition(command.scope,command.operationId,operation.version,receiptOutcome(command,receipt),receipt,null);
    else if(failure){const status=failure.outcome==="not_sent"?"not_sent":failure.outcome==="rejected"?"refused":"pending_reconciliation";operation=await store.transition(command.scope,command.operationId,operation.version,status,null,{kind:failure.kind,message:failure.message,httpStatus:failure.httpStatus});if(status==="pending_reconciliation")operation=await this.reconcile(command.scope,command.operationId);}
    await store.attempt(command.scope,{id:randomUUID(),operationId:command.operationId,startedAt,finishedAt:this.now().toISOString(),outcome:operation.status,debugId:operation.receipt?.debugId??null,receiptId:operation.receipt?.id??null});
    return operation;
  }
  async reconcile(scope:PaymentScope,operationId:string,signal?:AbortSignal):Promise<PaymentOperation>{
    const {store,provider}=this.options;
    const operation=await store.get(scope,operationId);
    if(!operation)throw new PaymentError("NOT_FOUND","Payment operation not found.",404);
    if(operation.status==="succeeded"||operation.status==="refused"||operation.status==="not_sent")return operation;
    let receipt:ProviderReceipt|null;
    try { receipt=await provider.reconcile(operation,signal); }
    catch(error){ if(error instanceof ProviderError)return operation; throw error; }
    if(!receipt)return operation;
    try{return await store.transition(scope,operationId,operation.version,receiptOutcome(operation.command,receipt),{...receipt,reconciled:true},null);}
    catch(error){if(error instanceof PaymentError&&error.code==="OPERATION_CHANGED"){const current=await store.get(scope,operationId);if(current)return current;}throw error;}
  }
  /** Recover only the stored operation selected by its domain; never scans another policy's commands. */
  async recoverOperation(scope:PaymentScope,operationId:string,signal?:AbortSignal):Promise<PaymentOperation>{
    const operation=await this.options.store.get(scope,operationId);
    if(!operation)throw new PaymentError("NOT_FOUND","Payment operation not found.",404);
    const expired=Date.parse(operation.leaseUntil)<=this.now().getTime();
    if(operation.status==="pending_reconciliation"||(operation.status==="dispatching"&&expired))return this.reconcile(scope,operationId,signal);
    if(operation.status!=="claimed"||!expired)return operation;
    try{return await this.dispatch(operation,signal);}
    catch(error){
      // Concurrent schedulers may select the same expired claim. Only the SQL version winner
      // can transition to dispatching; losers return that original operation without a write.
      if(error instanceof PaymentError&&error.code==="OPERATION_CHANGED"){
        const current=await this.options.store.get(scope,operationId);if(current)return current;
      }
      throw error;
    }
  }
  /** Scope-wide recovery requires one policy that can authorize every selected command in the scope. */
  async recover(scope:PaymentScope){
    const operations=await this.options.store.list(scope);const recovered:PaymentOperation[]=[];
    for(const operation of operations){
      if(operation.status==="pending_reconciliation"||(operation.status==="dispatching"&&Date.parse(operation.leaseUntil)<=this.now().getTime()))recovered.push(await this.reconcile(scope,operation.command.operationId));
      else if(operation.status==="claimed"&&Date.parse(operation.leaseUntil)<=this.now().getTime())recovered.push(await this.dispatch(operation));
    }
    return recovered;
  }
  listReceipts(scope:PaymentScope){return this.options.store.list(scope).then(items=>items.flatMap(item=>item.receipt?[item.receipt]:[]));}
  async ingestWebhook(scope:PaymentScope,rawBody:string,headers:Headers,verifier:WebhookVerifier){
    if(Buffer.byteLength(rawBody)>1024*1024)throw new PaymentError("WEBHOOK_TOO_LARGE","Webhook exceeds the intake limit.",413);
    const result=await verifier.verify(rawBody,headers);
    let parsed:unknown;try{parsed=JSON.parse(rawBody);}catch{parsed=null;}
    const body=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{};
    const resource=body.resource&&typeof body.resource==="object"&&!Array.isArray(body.resource)?body.resource as Record<string,unknown>:{};
    const validId=(value:unknown)=>typeof value==="string"&&/^[A-Za-z0-9_.:-]{1,128}$/.test(value);
    const knownType=typeof body.event_type==="string"&&/^(CHECKOUT\.ORDER\.(APPROVED|COMPLETED)|PAYMENT\.CAPTURE\.(COMPLETED|PENDING|DECLINED|DENIED|REFUNDED|REVERSED)|PAYMENT\.REFUND\.(PENDING|FAILED)|PAYMENT\.AUTHORIZATION\.(CREATED|VOIDED)|PAYMENT\.SALE\.(COMPLETED|DENIED|PENDING|REFUNDED|REVERSED)|CUSTOMER\.DISPUTE\.(CREATED|UPDATED|RESOLVED)|INVOICING\.INVOICE\.(CREATED|SENT|CANCELLED|PAID|REFUNDED|SCHEDULED|UPDATED)|PAYMENT\.PAYOUTSBATCH\.(DENIED|PROCESSING|SUCCESS)|PAYMENT\.PAYOUTS-ITEM\.(BLOCKED|CANCELED|FAILED|HELD|REFUNDED|RETURNED|SUCCEEDED|UNCLAIMED))$/.test(body.event_type);
    // Intake admits a reconciliation hint, never a money/accounting conclusion.
    // Payout payloads identify their resource differently from payment payloads.
    const record=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
    let candidates:unknown[]=[resource.id];
    if(typeof body.event_type==="string"&&body.event_type.startsWith("INVOICING.INVOICE."))candidates=[resource.id,record(resource.invoice).id];
    else if(typeof body.event_type==="string"&&body.event_type.startsWith("PAYMENT.PAYOUTS-ITEM."))candidates=[resource.payout_item_id,resource.id];
    else if(typeof body.event_type==="string"&&body.event_type.startsWith("PAYMENT.PAYOUTSBATCH."))candidates=[record(resource.batch_header).payout_batch_id,resource.payout_batch_id,resource.id];
    const present=candidates.filter(value=>value!==undefined&&value!==null);
    const resourceId=present.length>0&&present.every(validId)&&new Set(present).size===1?String(present[0]):"unknown";
    const schemaValid=validId(body.id)&&resourceId!=="unknown"&&knownType;
    const rejectionReason=!result.verified?"invalid_signature":!schemaValid?"unsupported_or_malformed_event":null;
    const delivery:WebhookDelivery={id:randomUUID(),scope,eventId:validId(body.id)?String(body.id):`unidentified-${sha256(rawBody).slice(0,16)}`,eventType:knownType?String(body.event_type):"unknown",resourceId,transmissionId:result.transmissionId,receivedAt:this.now().toISOString(),bodyHash:sha256(rawBody),verified:result.verified,schemaValid,rejectionReason,source:this.options.provider.source,status:!result.verified?"rejected":!schemaValid?"dead_letter":"queued"};
    const recorded=await this.options.store.recordWebhook(delivery);
    if(!result.verified)throw new PaymentError("INVALID_SIGNATURE","Webhook signature could not be verified.",400);
    if(!schemaValid)throw new PaymentError("WEBHOOK_DEAD_LETTER","Verified webhook has an unsupported or malformed resource; saved for inspection.",422);
    if(recorded.conflict)throw new PaymentError("WEBHOOK_PAYLOAD_CONFLICT","A canonical event changed payload; delivery was retained for inspection.");
    return recorded;
  }
}

/** HTTP acceptance is not proof of completed money movement. */
export function receiptOutcome(command:PaymentCommand,receipt:ProviderReceipt):OperationStatus {
  if(receipt.operationId!==command.operationId||receipt.providerRequestId!==command.providerRequestId)return "pending_reconciliation";
  const action=command.action;
  const kind=action.kind==="create_order"?"order":action.kind==="authorize_order"||action.kind==="void_authorization"?"authorization":action.kind==="refund_capture"?"refund":"capture";
  const resources=receipt.resources.filter(resource=>resource.kind===kind);
  if(resources.length!==1)return "pending_reconciliation";
  const resource=resources[0]!;
  if(kind!=="order"&&(!resource.money||resource.money.currency!==action.money.currency||resource.money.minor!==action.money.minor))return "pending_reconciliation";
  if(action.kind==="create_order")return ["CREATED","SAVED","APPROVED","PAYER_ACTION_REQUIRED","COMPLETED"].includes(resource.status)?"succeeded":"pending_reconciliation";
  if(action.kind==="void_authorization")return resource.status==="VOIDED"?"succeeded":"pending_reconciliation";
  if(action.kind==="authorize_order")return ["CREATED","CAPTURED","PARTIALLY_CAPTURED"].includes(resource.status)?"succeeded":["DENIED","VOIDED"].includes(resource.status)?"refused":"pending_reconciliation";
  if(action.kind==="refund_capture")return resource.status==="COMPLETED"?"succeeded":["FAILED","CANCELLED"].includes(resource.status)?"refused":"pending_reconciliation";
  return ["COMPLETED","PARTIALLY_REFUNDED","REFUNDED"].includes(resource.status)?"succeeded":["DECLINED","DENIED","FAILED"].includes(resource.status)?"refused":"pending_reconciliation";
}
