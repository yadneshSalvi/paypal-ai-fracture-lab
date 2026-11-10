/** Portable payment-core v0.2.4. Domains retain policy; this package guards execution. */
export const PAYPAL_CORE_VERSION = "0.2.7";
export const SDK_COMMIT = "5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2";
export type EvidenceMode = "live_sandbox" | "sample" | "replay";
export interface PaymentScope { tenantId: string; projectId: string }
export interface MinorMoney { currency: string; minor: number }
export interface CheckoutItem { name:string; unitAmount:MinorMoney; quantity:number; sku?:string }
export interface CheckoutExperience {
  returnUrl:string; cancelUrl:string; userAction:"PAY_NOW"|"CONTINUE";
  shippingPreference:"GET_FROM_FILE"|"NO_SHIPPING";
  brandName?:string; locale?:string; landingPage?:"LOGIN"|"GUEST_CHECKOUT"|"NO_PREFERENCE";
}
export type WalletUsagePattern = "IMMEDIATE"|"DEFERRED"|"RECURRING_PREPAID"|"RECURRING_POSTPAID"|"THRESHOLD_PREPAID"|"THRESHOLD_POSTPAID"|"SUBSCRIPTION_PREPAID"|"SUBSCRIPTION_POSTPAID"|"UNSCHEDULED_PREPAID"|"UNSCHEDULED_POSTPAID"|"INSTALLMENT_PREPAID"|"INSTALLMENT_POSTPAID";
/** Domain evidence must bind this exact saved method and charge metadata to current consent. */
export interface SavedWallet {
  vaultId:string; consentId:string; consentVersion:number; consentDigest:string;
  paymentInitiator:"CUSTOMER"|"MERCHANT"; usagePattern:WalletUsagePattern;
  usage:"DERIVED"|"SUBSEQUENT";
}
/** Explicit buyer consent to save a new wallet after a successful purchase. */
export interface SaveWalletOnSuccess {
  consentId:string; consentVersion:number; consentDigest:string; usageType:"MERCHANT";
}
export type PaymentAction =
  | { kind:"create_order"; money:MinorMoney; intent:"CAPTURE"|"AUTHORIZE"; customId:string; experience?:CheckoutExperience; savedWallet?:SavedWallet; saveWalletOnSuccess?:SaveWalletOnSuccess; items?:CheckoutItem[] }
  | { kind:"capture_order"; money:MinorMoney; orderId:string }
  | { kind:"authorize_order"; money:MinorMoney; orderId:string }
  | { kind:"capture_authorization"; money:MinorMoney; authorizationId:string; orderId?:string; finalCapture?:boolean }
  | { kind:"refund_capture"; money:MinorMoney; captureId:string; orderId?:string }
  | { kind:"void_authorization"; money:MinorMoney; authorizationId:string; orderId?:string };
export interface PaymentApproval { id:string; version:number; digest:string; expiresAt:string }
export interface PaymentCommand {
  scope:PaymentScope; operationId:string; businessKey:string; intentId:string;
  providerRequestId:string; payloadHash:string; action:PaymentAction; approval:PaymentApproval;
}
export type OperationStatus = "claimed"|"dispatching"|"succeeded"|"pending_reconciliation"|"refused"|"not_sent";
export interface ProviderResource {
  kind:"order"|"authorization"|"capture"|"refund";
  id:string; status:string; money:MinorMoney|null; parentId:string|null;
  customId:string|null; observedAt:string; source:EvidenceMode;
  links:{rel:string;href:string;method:string}[];
}
export interface ProviderReceipt {
  id:string; operationId:string; providerRequestId:string; transport:"apimatic_sdk"|"typed_rest"|"local_fixture";
  source:EvidenceMode; status:number; observedAt:string; resources:ProviderResource[];
  debugId:string|null; bodyHash:string; reconciled:boolean;
}
export interface PaymentOperation {
  command:PaymentCommand; status:OperationStatus; version:number;
  createdAt:string; updatedAt:string; leaseUntil:string; receipt:ProviderReceipt|null;
  error:{kind:string;message:string;httpStatus:number}|null;
}
export interface PaymentAttempt {
  id:string; operationId:string; startedAt:string; finishedAt:string;
  outcome:OperationStatus; debugId:string|null; receiptId:string|null;
}
/** Authoritative external consumption plus IDs prevents double-counting our reconciled receipts. */
export interface ResourceReservation {
  resourceKey:string; currency:string; totalMinor:number;
  externallyConsumedMinor:number; observedProviderIds:string[]; observedAt:string;
}
export interface AuthorizationDecision {
  allowed:boolean; reason:string; resourceIds:string[]; currency:string; maximumMinor:number;
  approvalId:string; approvalVersion:number; approvalDigest:string; reservation?:ResourceReservation;
  checkoutOrigins?:string[];
  savedWalletConsent?:(SavedWallet & {expiresAt:string});
  saveWalletConsent?:(SaveWalletOnSuccess & {expiresAt:string});
}
export interface PaymentPolicy { authorize(command:PaymentCommand):Promise<AuthorizationDecision> }
export interface PaymentStore {
  claim(command:PaymentCommand,reservation?:ResourceReservation):Promise<{won:boolean;operation:PaymentOperation}>;
  reclaim(command:PaymentCommand,expectedVersion:number,reservation?:ResourceReservation):Promise<PaymentOperation>;
  get(scope:PaymentScope,operationId:string):Promise<PaymentOperation|null>;
  transition(scope:PaymentScope,operationId:string,expectedVersion:number,status:OperationStatus,receipt:ProviderReceipt|null,error:PaymentOperation["error"]):Promise<PaymentOperation>;
  attempt(scope:PaymentScope,attempt:PaymentAttempt):Promise<void>;
  list(scope:PaymentScope):Promise<PaymentOperation[]>;
  recordWebhook(delivery:WebhookDelivery):Promise<{duplicate:boolean;eventId:string;conflict?:boolean}>;
}
export interface ProviderAdapter {
  readonly source:EvidenceMode;
  execute(command:PaymentCommand,signal?:AbortSignal):Promise<ProviderReceipt>;
  reconcile(operation:PaymentOperation,signal?:AbortSignal):Promise<ProviderReceipt|null>;
  read(kind:ProviderResource["kind"],id:string,signal?:AbortSignal):Promise<ProviderResource[]>;
}
export interface WebhookDelivery {
  id:string; scope:PaymentScope; eventId:string; eventType:string; resourceId:string;
  transmissionId:string; receivedAt:string; bodyHash:string;
  verified:boolean; schemaValid:boolean; rejectionReason:string|null; source:EvidenceMode; status:"queued"|"rejected"|"dead_letter";
}
export interface WebhookVerifier { verify(rawBody:string,headers:Headers):Promise<{verified:boolean;transmissionId:string}> }
export interface PaymentCoreOptions { store:PaymentStore; provider:ProviderAdapter; policy:PaymentPolicy; now?:()=>Date }

export class PaymentError extends Error {
  constructor(public readonly code:string,message:string,public readonly httpStatus=409,options?:ErrorOptions){super(message,options);this.name="PaymentError";}
}
export class ProviderError extends Error {
  constructor(public readonly kind:"api"|"connection"|"timeout"|"decode"|"encode"|"auth",message:string,public readonly outcome:"unknown"|"rejected"|"not_sent",public readonly httpStatus:number,public readonly debugId:string|null=null,options?:ErrorOptions){super(message,options);this.name="ProviderError";}
}
