import { randomUUID } from 'node:crypto';
import { canonicalJson, sha256 } from '@fracture/paypal-core';
import type { SqlConnection } from '@fracture/paypal-core';
import { z } from 'zod';
import { TandemRefusal, TandemStore, type TandemResource } from './store';

const wireSchema=z.object({method:z.enum(['POST','GET']),path:z.string().regex(/^\/v2\/(checkout\/orders|payments\/(authorizations|captures|refunds))(\/[A-Za-z0-9_-]+){0,2}$/),headers:z.record(z.string(),z.string()),body:z.unknown(),timeout:z.number().positive().max(20)}).strict();
export interface BridgeResponse {outcome:'ok'|'not_sent'|'unknown'|'refused';payload:Record<string,unknown>}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const amount=(minor:number)=>({currency_code:'USD',value:`${Math.floor(minor/100)}.${String(minor%100).padStart(2,'0')}`});
function parseMoney(value:unknown){const o=object(value);if(o.currency_code!=='USD'||typeof o.value!=='string'||! /^(0|[1-9][0-9]{0,6})\.[0-9]{2}$/.test(o.value))throw new TandemRefusal('INVALID_AMOUNT');const [d,c]=o.value.split('.');return Number(d)*100+Number(c);}
function response(status:number,body:unknown):BridgeResponse{return {outcome:'ok',payload:{status,headers:{'content-type':'application/json'},bodyBase64:Buffer.from(status===204?'':JSON.stringify(body)).toString('base64')}};}
function refused(issue:string,status=422){return response(status,{name:'UNPROCESSABLE_ENTITY',message:'The Sample provider refused this request.',debug_id:'SAMPLE-TANDEM',details:[{issue,description:issue,location:'body'}]});}

/** Explicitly Sample provider state. No network request or real credential is used. */
export class TandemProvider {
  constructor(readonly store:TandemStore){}
  private async consumeFault(name:string,tx:SqlConnection){const run=await this.store.run(tx);if(!run.faults.includes(name))return false;return !!(await tx.query('INSERT INTO tandem_faults(run_id,fault) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING fault',[this.store.runId,name])).rowCount;}
  async exchange(input:unknown):Promise<BridgeResponse>{
    const wire=wireSchema.parse(input);
    if(Object.keys(wire.headers).some(k=>!['content-type','accept','paypal-request-id','idempotency-key','prefer'].includes(k))||Buffer.byteLength(JSON.stringify(wire.body))>131072)throw new TandemRefusal('WIRE_NOT_ALLOWED');
    return this.store.db.transaction(async tx=>{
      const run=await this.store.run(tx,true);
      if(wire.method==='POST'&&(run.revoked||Date.parse(run.expiresAt)<=Date.now()))return {outcome:'not_sent',payload:{code:'CONTROL_AUTHORITY_CLOSED'}};
      if(run.faults.includes('auth_not_sent')){await this.store.event('transport.not_sent',{method:wire.method,path:wire.path},tx);return {outcome:'not_sent',payload:{code:'SAMPLE_AUTHENTICATION_FAILURE'}};}
      await this.store.event('provider.request',{method:wire.method,path:wire.path,headers:wire.headers,body:wire.body,source:'sample'},tx);
      const requestId=wire.headers['paypal-request-id']??null;
      const endpoint=`${wire.method} ${wire.path}`,payloadHash=sha256(canonicalJson(wire.body));
      if(wire.method==='POST'&&requestId){
        const prior=(await tx.query<{payload_hash:string;response:unknown}&Record<string,unknown>>('SELECT payload_hash,response FROM tandem_provider_keys WHERE run_id=$1 AND endpoint=$2 AND request_id=$3',[run.id,endpoint,requestId])).rows[0];
        if(prior)return prior.payload_hash===payloadHash?(typeof prior.response==='string'?JSON.parse(prior.response):prior.response) as BridgeResponse:refused('REQUEST_ID_PAYLOAD_MISMATCH');
      }
      const all=await this.store.resources(tx),parts=wire.path.split('/').filter(Boolean),id=parts[3],verb=parts[4],body=object(wire.body);
      let result:BridgeResponse;
      if(wire.method==='GET'){
        if(run.faults.includes('unavailable_read'))return refused('SAMPLE_READ_UNAVAILABLE',503);
        const kind=parts[1]==='checkout'?'order':parts[2]==='authorizations'?'authorization':parts[2]==='captures'?'capture':'refund';
        const resource=all.find(r=>r.id===id&&r.kind===kind);
        result=resource?response(200,resource.body):refused('RESOURCE_NOT_FOUND',404);
        await this.store.event('provider.resource_read',{id:id??null,kind,found:!!resource,source:'sample'},tx);return result;
      }
      if(wire.path==='/v2/checkout/orders'){
        const units=body.purchase_units;
        if(!Array.isArray(units)||units.length!==1||!['CAPTURE','AUTHORIZE'].includes(String(body.intent)))return refused('INVALID_ORDER');
        const unit=object(units[0]);let minor:number;try{minor=parseMoney(unit.amount);}catch{return refused('INVALID_AMOUNT');}
        if(unit.custom_id!==run.intent||unit.reference_id!==run.intent||minor!==run.minor)return refused('UNREGISTERED_SAMPLE_PURCHASE');
        if(all.filter(r=>r.kind==='order').length>=6)return refused('SAMPLE_RESOURCE_LIMIT');
        const orderId=`SAMPLE-ORDER-${randomUUID()}`;
        const order:TandemResource={id:orderId,kind:'order',parentId:null,intent:run.intent,minor,status:'APPROVED',requestId,body:{id:orderId,status:'APPROVED',intent:body.intent,purchase_units:[{reference_id:run.intent,custom_id:run.intent,amount:amount(minor),payments:{captures:[],authorizations:[]}}]}};
        await this.store.saveResource(order,tx);
        await this.store.event('sample.buyer_approval',{orderId,purpose:'Scripted Sample buyer under the frozen fixture manifest; not an external approval.'},tx);
        result=response(201,order.body);
      } else {
        const resource=all.find(r=>r.id===id);
        if(!resource)return refused('RESOURCE_NOT_FOUND',404);
        if(parts[1]==='checkout'&&parts[2]==='orders'&&resource.kind==='order'&&(verb==='capture'||verb==='authorize')){
          if(resource.status!=='APPROVED'||resource.body.intent!==(verb==='capture'?'CAPTURE':'AUTHORIZE'))return refused('ORDER_NOT_APPROVED');
          const kind=verb==='capture'?'capture':'authorization',newId=`SAMPLE-${kind.toUpperCase()}-${randomUUID()}`;
          const status=kind==='capture'?(run.faults.includes('capture_pending')?'PENDING':'COMPLETED'):'CREATED';
          const child:TandemResource={id:newId,kind,parentId:resource.id,intent:run.intent,minor:resource.minor,status,requestId,body:{id:newId,status,amount:amount(resource.minor),custom_id:run.intent,...(kind==='capture'?{supplementary_data:{related_ids:{order_id:resource.id}}}:{expiration_time:new Date(Date.now()+3600000).toISOString()})}};
          await this.store.saveResource(child,tx);resource.status='COMPLETED';resource.body.status='COMPLETED';
          this.attach(resource,kind==='capture'?'captures':'authorizations',child.body);await this.store.saveResource(resource,tx);result=response(201,resource.body);
        } else if(parts[1]==='payments'&&parts[2]==='authorizations'&&resource.kind==='authorization'&&verb==='capture'){
          let minor:number;try{minor=parseMoney(body.amount);}catch{return refused('INVALID_AMOUNT');}
          const used=all.filter(r=>r.kind==='capture'&&r.parentId===resource.id).reduce((n,r)=>n+r.minor,0);
          if(!['CREATED','PARTIALLY_CAPTURED'].includes(resource.status)||minor<=0||minor+used>resource.minor)return refused('AUTHORIZATION_AMOUNT_EXCEEDED');
          if(Date.parse(String(resource.body.expiration_time))<=Date.now())return refused('AUTHORIZATION_EXPIRED');
          const captureId=`SAMPLE-CAPTURE-${randomUUID()}`,status=run.faults.includes('capture_pending')?'PENDING':'COMPLETED';
          const capture:TandemResource={id:captureId,kind:'capture',parentId:resource.id,intent:run.intent,minor,status,requestId,body:{id:captureId,status,amount:amount(minor),custom_id:run.intent,final_capture:body.final_capture===true,supplementary_data:{related_ids:{authorization_id:resource.id,order_id:resource.parentId}}}};
          await this.store.saveResource(capture,tx);resource.status=body.final_capture===true||minor+used===resource.minor?'CAPTURED':'PARTIALLY_CAPTURED';resource.body.status=resource.status;await this.store.saveResource(resource,tx);await this.updateOrder(resource,all,tx,capture);result=response(201,capture.body);
        } else if(parts[1]==='payments'&&parts[2]==='authorizations'&&resource.kind==='authorization'&&verb==='void'){
          if(!['CREATED','PARTIALLY_CAPTURED'].includes(resource.status))return refused('AUTHORIZATION_ALREADY_CLOSED');
          resource.status='VOIDED';resource.body.status='VOIDED';await this.store.saveResource(resource,tx);await this.updateOrder(resource,all,tx);result=response(204,null);
        } else if(parts[1]==='payments'&&parts[2]==='captures'&&resource.kind==='capture'&&verb==='refund'){
          let minor:number;try{minor=parseMoney(body.amount);}catch{return refused('INVALID_AMOUNT');}
          const used=all.filter(r=>r.kind==='refund'&&r.parentId===resource.id&&['PENDING','COMPLETED'].includes(r.status)).reduce((n,r)=>n+r.minor,0);
          if(!['COMPLETED','PARTIALLY_REFUNDED'].includes(resource.status)||minor<=0||minor+used>resource.minor)return refused('REFUND_AMOUNT_EXCEEDED');
          const refundId=`SAMPLE-REFUND-${randomUUID()}`,status=run.faults.includes('refund_pending')?'PENDING':'COMPLETED';
          const refund:TandemResource={id:refundId,kind:'refund',parentId:resource.id,intent:run.intent,minor,status,requestId,body:{id:refundId,status,amount:amount(minor),custom_id:body.custom_id}};
          await this.store.saveResource(refund,tx);if(status==='COMPLETED'){resource.status=minor+used===resource.minor?'REFUNDED':'PARTIALLY_REFUNDED';resource.body.status=resource.status;await this.store.saveResource(resource,tx);}result=response(201,refund.body);
        } else return refused('UNSUPPORTED_SAMPLE_OPERATION',404);
      }
      // Commit provider effects and exact response before applying a declared
      // response-only fault. The target never receives this private observation.
      await this.store.event('provider.response_committed',{endpoint,status:result.payload.status,source:'sample'},tx);
      if(requestId)await tx.query('INSERT INTO tandem_provider_keys(run_id,endpoint,request_id,payload_hash,response) VALUES($1,$2,$3,$4,$5::jsonb)',[run.id,endpoint,requestId,payloadHash,JSON.stringify(result)]);
      const type=verb==='capture'?'capture':verb==='refund'?'refund':wire.path==='/v2/checkout/orders'?'create':verb;
      if(await this.consumeFault(`drop_${type}_once`,tx)){await this.store.event('fault.response_lost',{endpoint,source:'sample'},tx);return {outcome:'unknown',payload:{code:'SAMPLE_RESPONSE_LOST'}};}
      if(type==='capture'&&await this.consumeFault('malformed_capture_once',tx)){await this.store.event('fault.response_malformed',{endpoint,source:'sample'},tx);return response(201,{unexpected:'controlled malformed response'});}
      return result;
    });
  }
  private attach(order:TandemResource,family:string,child:Record<string,unknown>){const units=order.body.purchase_units as Record<string,unknown>[];const payment=object(units[0]!.payments);const list=Array.isArray(payment[family])?payment[family] as Record<string,unknown>[]:[];payment[family]=[...list.filter(r=>r.id!==child.id),child];units[0]!.payments=payment;}
  private async updateOrder(authorization:TandemResource,all:TandemResource[],tx:SqlConnection,capture?:TandemResource){const order=all.find(r=>r.id===authorization.parentId&&r.kind==='order');if(!order)return;this.attach(order,'authorizations',authorization.body);if(capture)this.attach(order,'captures',capture.body);await this.store.saveResource(order,tx);}
}
