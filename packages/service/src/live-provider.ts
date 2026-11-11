import { createHash } from 'node:crypto';
import { SandboxPayPalProvider, ProviderError, fromProviderMoney } from '@fracture/paypal-core';
import type { ProviderResource, SandboxConfig } from '@fracture/paypal-core';

const host='https://api-m.sandbox.paypal.com';
export interface LiveObservation {method:string;path:string;status:number;bodyHash:string;resources:ProviderResource[];requestId:string|null}
export interface LiveObserver {authorizeWrite():Promise<void>;observe(value:LiveObservation):Promise<void>;dropCaptureResponse():Promise<boolean>}
type Wire=Record<string,unknown>;
const object=(v:unknown):Wire|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Wire:null;
function resource(kind:ProviderResource['kind'],v:Wire,parentId:string|null,moneyRequired=true):ProviderResource{
 const amount=object(v.amount);if(typeof v.id!=='string'||typeof v.status!=='string'||moneyRequired&&(!amount||typeof amount.currency_code!=='string'||typeof amount.value!=='string'))throw new ProviderError('decode','The original resource lacks its identity, status, or money.','unknown',502);
 const money=amount&&typeof amount.currency_code==='string'&&typeof amount.value==='string'?fromProviderMoney({currencyCode:amount.currency_code,value:amount.value}):null;
 return {kind,id:v.id,status:v.status,money,parentId,customId:typeof v.custom_id==='string'?v.custom_id:null,observedAt:new Date().toISOString(),source:'live_sandbox',links:[]};
}
/** Only payment-resource fields cross the public evidence boundary; payer data never does. */
export function liveResources(value:unknown,path:string):ProviderResource[]{
 const body=object(value);if(!body||typeof body.id!=='string'||typeof body.status!=='string')return [];
 if(path.startsWith('/v2/checkout/orders')){
  const order=resource('order',body,null,false);const units=Array.isArray(body.purchase_units)?body.purchase_units.map(object).filter((v):v is Wire=>v!==null):[];
  if(units.length===1){const unit=units[0]!;const amount=object(unit.amount);if(amount&&typeof amount.currency_code==='string'&&typeof amount.value==='string')order.money=fromProviderMoney({currencyCode:amount.currency_code,value:amount.value});if(typeof unit.custom_id==='string')order.customId=unit.custom_id;}
  const result=[order];
  for(const unit of units){
   const payments=object(unit.payments);
   for(const [key,kind] of [['captures','capture'],['authorizations','authorization'],['refunds','refund']] as const){
    const rows=payments?.[key];if(Array.isArray(rows))for(const row of rows){const item=object(row);if(item)result.push(resource(kind,item,order.id));}
   }
  }
  return result;
 }
 const kind=path.includes('/refunds/')||path.endsWith('/refund')?'refund':path.includes('/authorizations/')?'authorization':'capture';const parentId=kind==='refund'&&path.endsWith('/refund')?path.split('/')[4]??null:null;return [resource(kind,body,parentId)];
}

/** Real network boundary; response faults never edit a request or synthesize provider success. */
export class LivePayPalGateway {
 readonly provider:SandboxPayPalProvider;
 private token:{value:string;expires:number}|null=null;
 private tokenPending:Promise<string>|null=null;
 constructor(private readonly config:SandboxConfig,private readonly observer:LiveObserver,private readonly network:typeof fetch=fetch){
  this.provider=new SandboxPayPalProvider(config,this.transport);
 }
 readonly transport:typeof fetch=async(input,init)=>{
  const request=new Request(input,init);const url=new URL(request.url);if(url.origin!==host)throw new ProviderError('encode','Only the fixed PayPal sandbox host is allowed.','not_sent',400);
  if(request.method==='POST'&&url.pathname!=='/v1/oauth2/token')await this.observer.authorizeWrite();
  const response=await this.network(request);
  if(url.pathname==='/v1/oauth2/token')return response;
  const text=await response.clone().text();let data:unknown;try{data=JSON.parse(text);}catch{data=null;}
  const resources=response.ok?liveResources(data,url.pathname):[];
  await this.observer.observe({method:request.method,path:url.pathname,status:response.status,bodyHash:createHash('sha256').update(text).digest('hex'),resources,requestId:request.headers.get('paypal-request-id')});
  if(response.ok&&request.method==='POST'&&/^\/v2\/checkout\/orders\/[^/]+\/capture$/.test(url.pathname)&&resources.some(r=>r.kind==='capture'&&r.status==='COMPLETED')&&await this.observer.dropCaptureResponse())throw new TypeError('Controlled response-only interruption after the recorded upstream capture.');
  return response;
 };
 private async accessToken():Promise<string>{
  if(this.token&&this.token.expires>Date.now()+30000)return this.token.value;
  if(this.tokenPending)return this.tokenPending;
  this.tokenPending=(async()=>{const response=await this.network(new Request(host+'/v1/oauth2/token',{method:'POST',headers:{authorization:'Basic '+Buffer.from(this.config.clientId+':'+this.config.clientSecret).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)}));const value=await response.json() as {access_token?:unknown;expires_in?:unknown};if(!response.ok||typeof value.access_token!=='string'||typeof value.expires_in!=='number')throw new ProviderError('auth','Sandbox authentication failed before the purchase request.','not_sent',502);this.token={value:value.access_token,expires:Date.now()+Math.max(0,value.expires_in)*1000};return this.token.value;})();
  try{return await this.tokenPending;}finally{this.tokenPending=null;}
 }
 async raw(path:string,body:unknown):Promise<ProviderResource[]>{
  if(path!=='/v2/checkout/orders'&&!/^\/v2\/checkout\/orders\/[a-zA-Z0-9_-]{3,128}\/capture$/.test(path))throw new ProviderError('encode','This raw fixture admits only its original create and capture operations.','not_sent',400);
  const token=await this.accessToken();const response=await this.transport(new Request(host+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}));
  if(!response.ok)throw new ProviderError('api','PayPal refused or could not confirm this request.',response.status>=500?'unknown':'rejected',response.status);
  const resources=liveResources(await response.json(),path);if(!resources.length)throw new ProviderError('decode','The response did not identify an original resource.','unknown',502);return resources;
 }
 async approvedOrder(id:string,intentId:string){
  const result=await this.provider.client.orders.getOrder({id},{signal:AbortSignal.timeout(20000)}).asApiResult();
  if(!result.ok)throw new ProviderError('api','The original order approval could not be verified.','rejected',result.status);
  const units=result.value.purchaseUnits;const unit=units?.[0];if(result.value.status!=='APPROVED'||result.value.intent!=='CAPTURE'||units?.length!==1||!unit?.amount||unit.customId!==intentId)throw new ProviderError('api','Complete PayPal approval for this exact purchase.','rejected',409);
  const money=fromProviderMoney(unit.amount);if(money.currency!=='USD'||money.minor!==1200)throw new ProviderError('api','The approved amount does not match this twelve-dollar purchase.','rejected',409);
 }
 async approvalUrl(id:string){
  const result=await this.provider.client.orders.getOrder({id},{signal:AbortSignal.timeout(20000)}).asApiResult();
  if(!result.ok)throw new ProviderError('api','The saved approval link could not be read.','rejected',result.status);
  const link=result.value.links?.find(link=>['approve','payer-action'].includes(link.rel)&&(!link.method||link.method==='GET'));
  if(!link)return null;
  const url=new URL(link.href);if(url.origin!=='https://www.sandbox.paypal.com'||url.username||url.password||url.searchParams.get('token')!==id)throw new ProviderError('decode','The approval link is outside this original sandbox order.','not_sent',502);
  return url.href;
 }
}
