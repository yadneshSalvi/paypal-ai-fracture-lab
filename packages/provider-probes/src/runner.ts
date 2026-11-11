import { PaypalClient, PaypalError, type Order } from 'paypal';
import { hash, orderBody, wireBody, type Manifest, type Slot } from './contract';
import { ProbeStore, type CallRecord } from './store';
export const sandboxOrigin='https://api-m.sandbox.paypal.com';
const validOrderId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Z0-9]{10,32}$/.test(value);
interface Config {environment:string;baseUrl:string;isolated:boolean;clientId:string;clientSecret:string}
function refusal(status:number,payload:unknown){
 if(status===401||status===403)return {status,reason:'Provider credentials unavailable'};
 if(status===429)return {status,reason:'Provider quota temporarily unavailable'};
 if(status>=500)return {status,reason:'Provider temporarily unavailable'};
 const p=payload as {body?:{name?:unknown;message?:unknown;details?:{issue?:unknown;description?:unknown}[]}};
 // Controlled probe fields contain no buyer data; only declared reason text is retained.
 const reason=typeof p.body?.message==='string'?p.body.message.slice(0,1000):'Provider refused the experiment request';
 return {status,reason,issues:p.body?.details?.flatMap(x=>typeof x.issue==='string'?[x.issue.slice(0,120)]:[])??[]};
}
function orderProof(order:Order,slot:Slot){const unit=order.purchaseUnits?.[0];if(!validOrderId(order.id)||order.status!=='CREATED'||order.intent!=='CAPTURE'||order.purchaseUnits?.length!==1||unit?.amount?.currencyCode!=='USD'||unit.amount.value!=='1.00'||unit.customId!==slot.customId||unit.payments?.captures?.length||unit.payments?.authorizations?.length||unit.payments?.refunds?.length)throw Error('ORDER_NOT_EXACT_UNAPPROVED_PROBE');return {id:order.id,status:order.status,intent:order.intent,currency:'USD',value:'1.00',customId:unit.customId,captureCount:0,authorizationCount:0,refundCount:0};}
export class ProbeRunner{
 readonly client:PaypalClient;private active:Slot|null=null;
 constructor(readonly store:ProbeStore,readonly manifest:Manifest,config:Config,network:(request:Request)=>Promise<Response>=request=>fetch(request)){
  if(config.environment!=='sandbox'||config.baseUrl!==sandboxOrigin||!config.isolated||!config.clientId||!config.clientSecret||hash(config.clientId)!==manifest.merchantFingerprint)throw Error('ISOLATED_SANDBOX_CONFIG_MISMATCH');
  this.client=new PaypalClient({serverOptions:{baseUrl:sandboxOrigin},oauth2:{clientId:config.clientId,clientSecret:config.clientSecret},retry:{maxRetries:0,timeout:15000},logging:{level:'off'},fetch:async request=>{
   if(!(request instanceof Request))throw Error('SDK_REQUEST_SHAPE');
   const url=new URL(request.url);if(url.origin!==sandboxOrigin||url.search||url.username||url.password)throw Error('PROBE_TRANSPORT_SCOPE');
   const forwarded=new Request(request,{redirect:'error'});
   if(request.method==='POST'&&url.pathname==='/v1/oauth2/token')return network(forwarded);
   const slot=this.active;if(!slot)throw Error('PROBE_CALL_NOT_ACTIVE');
   if(request.method==='GET'){
    const id=url.pathname.match(/^\/v2\/checkout\/orders\/([A-Z0-9]{10,32})$/)?.[1];if(!id||!await store.owns(manifest.id,id))throw Error('PROBE_READ_NOT_OWNED');return network(forwarded);
   }
   if(request.method!=='POST'||url.pathname!=='/v2/checkout/orders')throw Error('PROBE_MUTATION_FORBIDDEN');
   const row=await store.read(manifest.id,slot.key);if(!row||row.state!=='claimed'||row.input_hash!==hash(slot))throw Error('PROBE_CLAIM_MISSING');
   const body=JSON.parse(await forwarded.clone().text()) as unknown;
   if(hash(body)!==hash(wireBody(slot))||request.headers.get('paypal-request-id')!==slot.providerId||request.headers.get('prefer')!=='return=representation')throw Error('PROBE_WIRE_CHANGED');
   forwarded.headers.set('Idempotency-Key',slot.genericId);
   const trace={method:'POST',path:url.pathname,at:new Date().toISOString(),bodyHash:hash(body),genericId:forwarded.headers.get('idempotency-key'),providerId:forwarded.headers.get('paypal-request-id'),prefer:forwarded.headers.get('prefer'),sdkVersion:forwarded.headers.get('x-apimatic-package-version')};
   await store.update(manifest.id,slot.key,'dispatching',{trace});
   const response=await network(forwarded);const text=await response.clone().text();if(text.length>1024*1024)throw Error('PROBE_RESPONSE_TOO_LARGE');
   let raw:unknown;try{raw=JSON.parse(text);}catch{raw=null;}
   const id=raw&&typeof raw==='object'?'id'in raw?raw.id:undefined:undefined;
   const observed={status:response.status,at:new Date().toISOString(),bodyHash:hash(text),body:raw,debugId:response.headers.get('paypal-debug-id')};
   await store.update(manifest.id,slot.key,'observed',{response:observed,...(response.ok&&validOrderId(id)?{orderId:id}:{})});return response;
  }});
 }
 private async readback(slot:Slot,id:string){const result=await this.client.orders.getOrder({id},{signal:AbortSignal.timeout(25000)}).asApiResult();if(!result.ok){await this.store.update(this.manifest.id,slot.key,'unknown',{failure:{stage:'read',...refusal(result.status,result.payload)}});return;}
  const proof=orderProof(result.value,slot);if(proof.id!==id)throw Error('PROBE_READ_IDENTITY_CHANGED');await this.store.update(this.manifest.id,slot.key,'verified',{readback:{...proof,httpStatus:result.status,at:new Date().toISOString()}});
 }
 async call(slot:Slot):Promise<CallRecord>{
  if(this.active)throw Error('PROBE_RUNNER_BUSY');const claimed=await this.store.claim(this.manifest.id,slot);if(claimed.row.state==='verified')return claimed.row;
  this.active=slot;
  try{
   if(!claimed.fresh){if(claimed.row.order_id){await this.readback(slot,claimed.row.order_id);return (await this.store.read(this.manifest.id,slot.key))!;}return claimed.row;}
   try{
    const result=await this.client.orders.createOrder({body:orderBody(slot),prefer:'return=representation',...(slot.providerId?{payPalRequestId:slot.providerId}:{})},{signal:AbortSignal.timeout(25000)}).asApiResult();
    if(!result.ok){await this.store.update(this.manifest.id,slot.key,result.status>=500?'unknown':'refused',{failure:{stage:'create',...refusal(result.status,result.payload)}});return (await this.store.read(this.manifest.id,slot.key))!;}
    const proof=orderProof(result.value,slot);const saved=await this.store.read(this.manifest.id,slot.key);if(saved?.order_id!==proof.id)throw Error('PROBE_RECORDED_IDENTITY_MISMATCH');
    await this.readback(slot,proof.id);
   }catch(error){
    const row=await this.store.read(this.manifest.id,slot.key);if(row?.state==='verified')return row;
    const neverSent=row?.state==='claimed';await this.store.update(this.manifest.id,slot.key,neverSent?'not_sent':'unknown',{failure:{stage:'create_or_read',kind:error instanceof PaypalError?error.kind:'application_or_abort',reason:neverSent?'No create request reached transport':'Original outcome retained; no write retry'}});
    if(!neverSent&&row?.order_id){try{await this.readback(slot,row.order_id);}catch{await this.store.update(this.manifest.id,slot.key,'unknown',{failure:{stage:'read',reason:'Original resource could not be verified'}});}}
    if(!(error instanceof PaypalError)&&!(error instanceof DOMException))throw error;
   }
   return (await this.store.read(this.manifest.id,slot.key))!;
  }finally{this.active=null;}
 }
 async run(){return this.store.withLock(this.manifest.id,async()=>{const current=await this.store.manifest(this.manifest.id);if(hash(current)!==hash(this.manifest))throw Error('CAMPAIGN_CHANGED');for(const slot of current.slots){const row=await this.call(slot);if(row.state!=='verified')return {completed:false,stoppedAt:slot.key,state:row.state};}return {completed:true,stoppedAt:null,state:'verified'};});}
}
