import { randomUUID } from "node:crypto";
import { PaypalClient, CheckoutPaymentIntent } from "paypal";
import type { ClientOptions, PaypalError, Order, OrderAuthorizeResponse, Money, LinkDescription, PaymentSource, ItemRequest, PurchaseUnitRequest } from "paypal";
import { canonicalJson, fromProviderMoney, toProviderMoney, sha256 } from "./canonical.js";
import { PaymentError, ProviderError } from "./types.js";
import type { PaymentCommand, PaymentOperation, ProviderAdapter, ProviderReceipt, ProviderResource } from "./types.js";

export interface SandboxConfig { environment:"sandbox"; baseUrl:string; clientId:string; clientSecret:string; isolatedProject:string }
export function assertSandboxConfig(config:SandboxConfig){
  if(config.environment!=="sandbox"||config.baseUrl!=="https://api-m.sandbox.paypal.com")throw new PaymentError("SANDBOX_REQUIRED","The payment core accepts the PayPal sandbox host only.",503);
  if(!config.clientId||!config.clientSecret||!config.isolatedProject)throw new PaymentError("ISOLATION_REQUIRED","Project-specific sandbox credentials and an isolation marker are required.",503);
}
type Outcome<T>={ok:true;value:T;status:number;headers:Headers}|{ok:false;status:number;headers:Headers;payload:unknown};
type ResourceShape={id?:string;status?:string;amount?:Money;customId?:string;links?:LinkDescription[]};
// Reviewed against PayPal's common-errors and payment-failures documentation.
// Return a bounded provider reason, never its free-text message/value/description.
const safeReasons:Readonly<Record<string,string>>={
  INSTRUMENT_DECLINED:"Choose another payment method.",
  CARD_EXPIRED:"Use a current card.",
  AMOUNT_MISMATCH:"Review the total and its breakdown.",
  ITEM_TOTAL_MISMATCH:"Review item prices and quantities.",
  CURRENCY_NOT_SUPPORTED:"Review the payment currency.",
  ORDER_NOT_APPROVED:"Complete PayPal approval for this order.",
  ORDER_ALREADY_CAPTURED:"Read the existing payment before taking another action.",
  ORDER_ALREADY_AUTHORIZED:"Read the existing authorization before taking another action.",
  PAYER_ACTION_REQUIRED:"Complete the requested action in PayPal.",
  INVALID_PARAMETER_VALUE:"Review the submitted field values.",
  MISSING_REQUIRED_PARAMETER:"Supply the required payment fields.",
  INVALID_RESOURCE_ID:"Review the referenced payment resource.",
  RESOURCE_NOT_FOUND:"The referenced resource was not found.",
  INVALID_REQUEST:"Review the request format and required fields.",
  UNPROCESSABLE_ENTITY:"Review the payment details.",
  PAYMENT_DENIED:"PayPal declined this payment.",
};
function safeProviderReason(payload:unknown):string|null {
  if(!payload||typeof payload!=="object")return null;
  let body:unknown="body" in payload?payload.body:null;
  if(!body&&"rawBody" in payload&&payload.rawBody instanceof ArrayBuffer&&payload.rawBody.byteLength<=8192){
    try{body=JSON.parse(new TextDecoder().decode(payload.rawBody));}catch{return null;}
  }
  if(!body||typeof body!=="object")return null;
  const codes:unknown[]=[];
  if("details" in body&&Array.isArray(body.details))for(const detail of body.details.slice(0,10)){
    if(detail&&typeof detail==="object"&&"issue" in detail)codes.push(detail.issue);
  }
  if("name" in body)codes.push(body.name);
  const code=codes.find((value):value is string=>typeof value==="string"&&Object.hasOwn(safeReasons,value));
  return code?`${code}: ${safeReasons[code]}`:null;
}
function apiFailure(status:number,debugId:string|null,payload?:unknown):ProviderError {
  if(status===401||status===403)return new ProviderError("api","The provider refused this application's credentials or permissions.","rejected",502,debugId);
  if(status===429)return new ProviderError("api","The provider rate limit refused this attempt.","rejected",503,debugId);
  if(status>=400&&status<500)return new ProviderError("api",safeProviderReason(payload)??`The provider refused the payment request (HTTP ${status}).`,"rejected",status,debugId);
  return new ProviderError("api",`The provider response is uncertain (HTTP ${status}); reconcile before another write.`,"unknown",502,debugId);
}
function translate(error:unknown):never {
  if(error instanceof ProviderError||error instanceof PaymentError)throw error;
  if(typeof error!=="object"||error===null||!("kind" in error)||!("uri" in error))throw error;
  const e=error as PaypalError;
  switch(e.kind){
    case "api":throw apiFailure(e.status,e.headers.get("paypal-debug-id"),e.payload);
    case "auth":throw new ProviderError("auth","Provider authentication failed before the payment request.","not_sent",502,null,{cause:error});
    case "encode":throw new ProviderError("encode","The payment request failed SDK validation before dispatch.","not_sent",400,null,{cause:error});
    case "decode":if(e.status>=400)throw apiFailure(e.status,e.headers.get("paypal-debug-id"));throw new ProviderError("decode","The provider success response was incomplete; reconcile the resource.","unknown",502,e.headers.get("paypal-debug-id"),{cause:error});
    case "connection":case "timeout":throw new ProviderError(e.kind,"The response was lost; the payment outcome is unknown.",e.uri.endsWith("/v1/oauth2/token")?"not_sent":"unknown",502,null,{cause:error});
    default:throw error;
  }
}

/** Real SDK adapter. No automatic write retries, no generic Idempotency-Key claim. */
export class SandboxPayPalProvider implements ProviderAdapter {
  readonly source="live_sandbox" as const;
  readonly client:PaypalClient;
  constructor(config:SandboxConfig,fetchImpl?:typeof fetch){
    assertSandboxConfig(config);
    const options:ClientOptions={serverOptions:{baseUrl:config.baseUrl},oauth2:{clientId:config.clientId,clientSecret:config.clientSecret},retry:{maxRetries:0,timeout:15000},logging:{level:"off"},...(fetchImpl?{fetch:fetchImpl}:{})};
    this.client=new PaypalClient(options);
  }
  private async invoke<T>(work:(signal:AbortSignal)=>Promise<Outcome<T>>,signal?:AbortSignal):Promise<{value:T;status:number;headers:Headers}>{
    const deadline=AbortSignal.timeout(25000);const combined=signal?AbortSignal.any([signal,deadline]):deadline;
    try {const result=await work(combined);if(!result.ok)throw apiFailure(result.status,result.headers.get("paypal-debug-id"),result.payload);return result;}
    catch(error){translate(error);}
  }
  private resource(kind:ProviderResource["kind"],value:ResourceShape,parentId:string|null=null,requireMoney=true):ProviderResource {
    if(!value.id||!value.status||requireMoney&&!value.amount)throw new ProviderError("decode",`The ${kind} response omitted its required identity, status, or amount.`,"unknown",502);
    const links=(value.links??[]).filter(link=>{try{const url=new URL(link.href);return url.protocol==="https:"&&["api-m.sandbox.paypal.com","api.sandbox.paypal.com","www.sandbox.paypal.com"].includes(url.hostname);}catch{return false;}}).map(link=>({href:link.href,rel:link.rel,method:link.method??"GET"}));
    return {kind,id:value.id,status:value.status,money:value.amount?fromProviderMoney(value.amount):null,parentId,customId:value.customId??null,observedAt:new Date().toISOString(),source:this.source,links};
  }
  private orderResources(order:Order|OrderAuthorizeResponse):ProviderResource[]{
    const result=[this.resource("order",order,null,false)];
    for(const unit of order.purchaseUnits??[]){
      for(const capture of unit.payments?.captures??[])result.push(this.resource("capture",capture,order.id??null));
      for(const authorization of unit.payments?.authorizations??[])result.push(this.resource("authorization",authorization,order.id??null));
      for(const refund of unit.payments?.refunds??[])result.push(this.resource("refund",refund,order.id??null));
    }
    return result;
  }
  private receipt(command:PaymentCommand,resources:ProviderResource[],status:number,headers=new Headers(),reconciled=false):ProviderReceipt {
    return {id:randomUUID(),operationId:command.operationId,providerRequestId:command.providerRequestId,transport:"apimatic_sdk",source:this.source,status,observedAt:new Date().toISOString(),resources,debugId:headers.get("paypal-debug-id"),bodyHash:sha256(canonicalJson(resources)),reconciled};
  }
  async read(kind:ProviderResource["kind"],id:string,signal?:AbortSignal):Promise<ProviderResource[]>{
    if(!/^[a-zA-Z0-9_-]{3,128}$/.test(id))throw new PaymentError("INVALID_RESOURCE_ID","Invalid provider resource identity.",400);
    switch(kind){
      case "order":{const r=await this.invoke(s=>this.client.orders.getOrder({id},{signal:s}).asApiResult(),signal);return this.orderResources(r.value);}
      case "capture":{const r=await this.invoke(s=>this.client.payments.getCapturedPayment({captureId:id},{signal:s}).asApiResult(),signal);return [this.resource(kind,r.value)];}
      case "authorization":{const r=await this.invoke(s=>this.client.payments.getAuthorizedPayment({authorizationId:id},{signal:s}).asApiResult(),signal);return [this.resource(kind,r.value)];}
      case "refund":{const r=await this.invoke(s=>this.client.payments.getRefund({refundId:id},{signal:s}).asApiResult(),signal);return [this.resource(kind,r.value)];}
    }
  }
  async execute(command:PaymentCommand,signal?:AbortSignal):Promise<ProviderReceipt>{
    const action=command.action;const amount=toProviderMoney(action.money);const common={payPalRequestId:command.providerRequestId,prefer:"return=representation"};
    switch(action.kind){
      case "create_order":{
        const items:ItemRequest[]|undefined=action.items?.map(item=>({name:item.name,unitAmount:toProviderMoney(item.unitAmount),quantity:String(item.quantity),...(item.sku===undefined?{}:{sku:item.sku})}));
        const purchaseUnit:PurchaseUnitRequest={amount:{...amount,...(items?{breakdown:{itemTotal:amount}}:{})},customId:action.customId,...(items?{items}:{})};
        const paymentSource:PaymentSource|undefined=action.experience||action.savedWallet||action.saveWalletOnSuccess?{paypal:{
          ...(action.experience?{experienceContext:action.experience}:{}),
          ...(action.savedWallet?{vaultId:action.savedWallet.vaultId,storedCredential:{paymentInitiator:action.savedWallet.paymentInitiator,usagePattern:action.savedWallet.usagePattern,usage:action.savedWallet.usage}}:{}),
          ...(action.saveWalletOnSuccess?{attributes:{vault:{storeInVault:"ON_SUCCESS",usageType:action.saveWalletOnSuccess.usageType}}}:{}),
        }}:undefined;
        const r=await this.invoke(s=>this.client.orders.createOrder({...common,body:{intent:action.intent==="CAPTURE"?CheckoutPaymentIntent.Capture:CheckoutPaymentIntent.Authorize,purchaseUnits:[purchaseUnit],...(paymentSource?{paymentSource}:{})}},{signal:s}).asApiResult(),signal);
        return this.receipt(command,this.orderResources(r.value),r.status,r.headers);
      }
      case "capture_order":case "authorize_order":{
        const before=await this.invoke(s=>this.client.orders.getOrder({id:action.orderId},{signal:s}).asApiResult(),signal);
        const units=before.value.purchaseUnits;
        if(before.value.status!=="APPROVED"||units?.length!==1||!units[0]?.amount)throw new ProviderError("api","The owning order has no verified approval or unambiguous purchase amount.","rejected",409);
        const current=fromProviderMoney(units[0].amount);
        if(current.currency!==action.money.currency||current.minor!==action.money.minor)throw new ProviderError("api","The approved order amount changed.","rejected",409);
        // The live Orders endpoint requires application/json; omitting the optional SDK
        // body also omits Content-Type. An empty typed body supplies it without a new source.
        const r=action.kind==="capture_order"?await this.invoke(s=>this.client.orders.captureOrder({...common,id:action.orderId,body:{}},{signal:s}).asApiResult(),signal):await this.invoke(s=>this.client.orders.authorizeOrder({...common,id:action.orderId,body:{}},{signal:s}).asApiResult(),signal);
        const resources=this.orderResources(r.value);
        if(!resources.some(item=>item.kind===(action.kind==="capture_order"?"capture":"authorization")))throw new ProviderError("decode","The order response omitted the payment resource.","unknown",502);
        return this.receipt(command,resources,r.status,r.headers);
      }
      case "capture_authorization":{
        const r=await this.invoke(s=>this.client.payments.captureAuthorizedPayment({...common,authorizationId:action.authorizationId,body:{amount,...(action.finalCapture===undefined?{}:{finalCapture:action.finalCapture})}},{signal:s}).asApiResult(),signal);
        return this.receipt(command,[this.resource("capture",r.value,action.authorizationId)],r.status,r.headers);
      }
      case "refund_capture":{
        const [capture]=await this.read("capture",action.captureId,signal);
        if(!capture?.money||!["COMPLETED","PARTIALLY_REFUNDED"].includes(capture.status)||capture.money.currency!==action.money.currency||capture.money.minor<action.money.minor)throw new ProviderError("api","This capture is not eligible for the approved refund.","rejected",409);
        const r=await this.invoke(s=>this.client.payments.refundCapturedPayment({...common,captureId:action.captureId,body:{amount,customId:command.operationId}},{signal:s}).asApiResult(),signal);
        return this.receipt(command,[this.resource("refund",r.value,action.captureId)],r.status,r.headers);
      }
      case "void_authorization":{
        const r=await this.invoke(s=>this.client.payments.voidPayment({...common,authorizationId:action.authorizationId},{signal:s}).asApiResult(),signal);
        return this.receipt(command,[this.resource("authorization",r.value,action.orderId??null)],r.status,r.headers);
      }
    }
  }
  async reconcile(operation:PaymentOperation,signal?:AbortSignal):Promise<ProviderReceipt|null>{
    const command=operation.command;const action=command.action;
    if(action.kind==="capture_order"||action.kind==="authorize_order"){
      const resources=await this.read("order",action.orderId,signal);const kind=action.kind==="capture_order"?"capture":"authorization";
      const candidates=resources.filter(item=>item.kind===kind&&item.money?.currency===action.money.currency&&item.money.minor===action.money.minor);
      if(candidates.length!==1)return null;
      const effect=await this.read(kind,candidates[0]!.id,signal);
      return this.receipt(command,[...resources.filter(item=>item.kind==="order"),...effect],200,new Headers(),true);
    }
    if(action.kind==="refund_capture"){
      await this.read("capture",action.captureId,signal);
      let refundId=operation.receipt?.resources.find(item=>item.kind==="refund")?.id;
      if(!refundId&&action.orderId){const resources=await this.read("order",action.orderId,signal);refundId=resources.find(item=>item.kind==="refund"&&item.customId===command.operationId)?.id;}
      if(!refundId)return null;
      const resources=await this.read("refund",refundId,signal);const refund=resources[0];
      if(refund?.money?.minor!==action.money.minor||refund.money.currency!==action.money.currency)return null;
      return this.receipt(command,resources,200,new Headers(),true);
    }
    if(action.kind==="void_authorization"){
      const resources=await this.read("authorization",action.authorizationId,signal);
      return resources[0]?.status==="VOIDED"?this.receipt(command,resources,200,new Headers(),true):null;
    }
    if(action.kind==="capture_authorization")await this.read("authorization",action.authorizationId,signal);
    // No guessed order IDs or attribution of an earlier partial capture to this attempt.
    const known=operation.receipt?.resources.find(item=>item.kind===(action.kind==="create_order"?"order":"capture"));
    return known?this.receipt(command,await this.read(known.kind,known.id,signal),200,new Headers(),true):null;
  }
  async searchTransactions(startDate:string,endDate:string,allowedIds:ReadonlySet<string>){
    const start=Date.parse(startDate),end=Date.parse(endDate);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>31*86400000)throw new PaymentError("INVALID_SEARCH_WINDOW","Transaction Search requires an ordered window of at most 31 days.",400);
    const items:{id:string;status:string|null;amount:ReturnType<typeof fromProviderMoney>|null;updatedAt:string|null}[]=[];const deadline=AbortSignal.timeout(25000);
    for(let page=1;page<=100;page++){
      const r=await this.invoke(s=>this.client.transactionSearch.searchTransactions({startDate,endDate,fields:"transaction_info",pageSize:100,page},{signal:s}).asApiResult(),deadline);
      // New sandbox accounts omit the array but explicitly report both totals as zero.
      const details=r.value.transactionDetails??(page===1&&r.value.totalItems===0&&r.value.totalPages===0?[]:undefined);
      if(!details||r.value.totalPages===undefined||!Number.isInteger(r.value.totalPages)||r.value.totalPages<0||r.value.totalPages===0&&details.length>0||r.value.page!==undefined&&r.value.page!==page)throw new ProviderError("decode","Transaction Search omitted or contradicted pagination evidence.","unknown",502);
      for(const detail of details){const info=detail.transactionInfo;if(info?.transactionId&&allowedIds.has(info.transactionId)){let amount=null;if(info.transactionAmount){const negative=info.transactionAmount.value.startsWith("-");amount=fromProviderMoney({...info.transactionAmount,value:info.transactionAmount.value.replace(/^-/ ,"")});if(negative)amount.minor=-amount.minor;}items.push({id:info.transactionId,status:info.transactionStatus??null,amount,updatedAt:info.transactionUpdatedDate??null});}}
      if(page>=r.value.totalPages)return {items,complete:true,pages:page,source:this.source};
    }
    return {items,complete:false,pages:100,source:this.source};
  }
}
