import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import pg from 'pg';
import {PayPalWebhookVerifier,type SandboxConfig} from '@fracture/paypal-core';
import {z} from 'zod';

const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const deliveryHeaderNames=['paypal-transmission-id','paypal-transmission-time','paypal-cert-url','paypal-auth-algo','paypal-transmission-sig'] as const;
const id=z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const eventSchema=z.object({id,event_type:z.string().min(1).max(120).regex(/^[A-Z0-9_.]+$/),create_time:z.string().datetime({offset:true}),resource:z.object({id:id.optional(),status:z.string().max(120).optional(),supplementary_data:z.object({related_ids:z.object({order_id:id.optional()}).passthrough().optional()}).passthrough().optional()}).passthrough()}).passthrough();
export type DeliveryEvent=z.infer<typeof eventSchema>;
export interface VerificationTrace {requestHash:string;responseHash:string;httpStatus:number;verificationStatus:string|null}
export interface DeliveryConfig {scope:string;webhookId:string;source:'sample'|'live_sandbox';key:Buffer}
type DeliveryOutcome='verified_new'|'verified_duplicate'|'event_conflict'|'rejected'|'verification_unavailable';
export interface DeliveryResult {attemptId:string;classification:DeliveryOutcome;status:number}

/** Private raw evidence never joins judge workspace DTOs or candidate processes. */
export class DeliveryStore {
 constructor(readonly pool:pg.Pool,readonly config:DeliveryConfig){
  if(!/^[a-f0-9]{64}$/.test(config.scope)||!config.webhookId||config.webhookId==='WEBHOOK_ID'||config.key.length!==32)throw Error('WEBHOOK_CONFIGURATION');
 }
 async initialize(){await this.pool.query(`
  CREATE TABLE IF NOT EXISTS fracture_native_deliveries(id uuid PRIMARY KEY,scope text NOT NULL,webhook_id text NOT NULL,source text NOT NULL,transmission_id text NOT NULL,event_id text NOT NULL,event_type text NOT NULL,body_hash text NOT NULL,private_evidence text NOT NULL,received_at timestamptz NOT NULL DEFAULT now(),classification text NOT NULL DEFAULT 'received',verified_at timestamptz,verification_trace jsonb,response_status integer);
  CREATE INDEX IF NOT EXISTS fracture_native_delivery_event ON fracture_native_deliveries(scope,webhook_id,event_id);
  CREATE TABLE IF NOT EXISTS fracture_native_events(scope text NOT NULL,webhook_id text NOT NULL,event_id text NOT NULL,event_type text NOT NULL,body_hash text NOT NULL,resource_id text,related_order_id text,provider_created_at timestamptz NOT NULL,first_delivery_id uuid NOT NULL REFERENCES fracture_native_deliveries(id),observed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(scope,webhook_id,event_id));
  CREATE TABLE IF NOT EXISTS fracture_delivery_rules(id uuid PRIMARY KEY,scope text NOT NULL,webhook_id text NOT NULL,event_type text NOT NULL,order_id text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),used_delivery_id uuid REFERENCES fracture_native_deliveries(id),UNIQUE(scope,webhook_id,event_type,order_id));
 `);}
 async start(rawBody:string,headers:Headers,event:DeliveryEvent){
  const attemptId=randomUUID(),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.config.key,iv);
  cipher.setAAD(Buffer.from(`${this.config.scope}:${this.config.webhookId}:${attemptId}`));
  const privateBody=JSON.stringify({rawBody,headers:Object.fromEntries(deliveryHeaderNames.map(k=>[k,headers.get(k)]))});
  const encrypted=Buffer.concat([cipher.update(privateBody,'utf8'),cipher.final()]);
  const envelope=['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
  await this.pool.query('INSERT INTO fracture_native_deliveries(id,scope,webhook_id,source,transmission_id,event_id,event_type,body_hash,private_evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[attemptId,this.config.scope,this.config.webhookId,this.config.source,headers.get('paypal-transmission-id'),event.id,event.event_type,digest(rawBody),envelope]);
  return attemptId;
 }
 async privateEvidence(attemptId:string){
  const row=(await this.pool.query<{private_evidence:string}>('SELECT private_evidence FROM fracture_native_deliveries WHERE id=$1 AND scope=$2 AND webhook_id=$3',[attemptId,this.config.scope,this.config.webhookId])).rows[0];if(!row)throw Error('DELIVERY_NOT_FOUND');
  const [version,iv,tag,data]=row.private_evidence.split('.');if(version!=='v1'||!iv||!tag||!data)throw Error('EVIDENCE_FORMAT');
  const decipher=createDecipheriv('aes-256-gcm',this.config.key,Buffer.from(iv,'base64url'));decipher.setAAD(Buffer.from(`${this.config.scope}:${this.config.webhookId}:${attemptId}`));decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')) as {rawBody:string;headers:Record<string,string>};
 }
 async rejected(attemptId:string,classification:'rejected'|'verification_unavailable',trace:VerificationTrace|null):Promise<DeliveryResult>{
  const status=classification==='rejected'?400:503;await this.pool.query("UPDATE fracture_native_deliveries SET classification=$2,verification_trace=$3,response_status=$4 WHERE id=$1 AND scope=$5 AND webhook_id=$6 AND classification='received'",[attemptId,classification,trace,status,this.config.scope,this.config.webhookId]);return {attemptId,classification,status};
 }
 async verified(attemptId:string,event:DeliveryEvent,trace:VerificationTrace):Promise<DeliveryResult>{
  const db=await this.pool.connect();try{
   await db.query('BEGIN');
   const delivery=(await db.query<{body_hash:string;classification:string}>("SELECT body_hash,classification FROM fracture_native_deliveries WHERE id=$1 AND scope=$2 AND webhook_id=$3 FOR UPDATE",[attemptId,this.config.scope,this.config.webhookId])).rows[0];if(!delivery||delivery.classification!=='received')throw Error('DELIVERY_NOT_PENDING');
   const orderId=event.resource.supplementary_data?.related_ids?.order_id??(event.event_type.startsWith('CHECKOUT.ORDER.')?event.resource.id:null)??null;
   const inserted=await db.query('INSERT INTO fracture_native_events(scope,webhook_id,event_id,event_type,body_hash,resource_id,related_order_id,provider_created_at,first_delivery_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(scope,webhook_id,event_id) DO NOTHING',[this.config.scope,this.config.webhookId,event.id,event.event_type,delivery.body_hash,event.resource.id??null,orderId,event.create_time,attemptId]);
   const canonical=(await db.query<{body_hash:string}>('SELECT body_hash FROM fracture_native_events WHERE scope=$1 AND webhook_id=$2 AND event_id=$3 FOR UPDATE',[this.config.scope,this.config.webhookId,event.id])).rows[0]!;
   const classification:DeliveryOutcome=canonical.body_hash!==delivery.body_hash?'event_conflict':inserted.rowCount?'verified_new':'verified_duplicate';
   let status=classification==='event_conflict'?409:200;
   if(status===200&&orderId){const rule=await db.query('UPDATE fracture_delivery_rules SET used_delivery_id=$1 WHERE scope=$2 AND webhook_id=$3 AND event_type=$4 AND order_id=$5 AND used_delivery_id IS NULL AND expires_at>now() RETURNING id',[attemptId,this.config.scope,this.config.webhookId,event.event_type,orderId]);if(rule.rowCount)status=500;}
   await db.query('UPDATE fracture_native_deliveries SET classification=$2,verified_at=now(),verification_trace=$3,response_status=$4 WHERE id=$1',[attemptId,classification,trace,status]);
   await db.query('COMMIT');return {attemptId,classification,status};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 }
 /** Called by owner maintenance only, never through a public HTTP action. */
 async armSingleFailure(input:{id:string;eventType:string;orderId:string;expiresAt:string}){
  z.object({id:z.string().uuid(),eventType:z.string().regex(/^[A-Z0-9_.]{1,120}$/),orderId:id,expiresAt:z.string().datetime()}).strict().parse(input);
  const duration=Date.parse(input.expiresAt)-Date.now();if(duration<=0||duration>3*86400000)throw Error('RULE_WINDOW');
  const inserted=await this.pool.query('INSERT INTO fracture_delivery_rules(id,scope,webhook_id,event_type,order_id,expires_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id',[input.id,this.config.scope,this.config.webhookId,input.eventType,input.orderId,input.expiresAt]);if(!inserted.rowCount)throw Error('RULE_ALREADY_EXISTS');
 }
}

export class DeliveryObserver {
 constructor(readonly store:DeliveryStore,readonly paypal:SandboxConfig,readonly transport:typeof fetch=fetch){}
 async ingest(rawBody:string,headers:Headers):Promise<DeliveryResult>{
  if(Buffer.byteLength(rawBody)>262144)throw Error('WEBHOOK_BODY_LIMIT');
  const event=eventSchema.parse(JSON.parse(rawBody));
  for(const name of deliveryHeaderNames){const value=headers.get(name);if(!value||value.length>(name==='paypal-transmission-sig'?4096:1024))throw Error('WEBHOOK_HEADERS');}
  const attemptId=await this.store.start(rawBody,headers,event);let trace:VerificationTrace|null=null;
  const bounded:typeof fetch=async(input,init)=>{
   const request=new Request(input,init),url=new URL(request.url);
   if(url.origin!=='https://api-m.sandbox.paypal.com'||request.method!=='POST'||!['/v1/oauth2/token','/v1/notifications/verify-webhook-signature'].includes(url.pathname))throw Error('WEBHOOK_TRANSPORT_BOUNDARY');
   const outbound=new Request(request,{redirect:'error'}),verification=url.pathname.endsWith('/verify-webhook-signature');
   const requestHash=verification?digest(await outbound.clone().text()):null;
   const response=await this.transport(outbound);
   if(verification){const text=await response.clone().text();let status:string|null=null;try{const parsed=JSON.parse(text) as {verification_status?:unknown};if(typeof parsed.verification_status==='string')status=parsed.verification_status.slice(0,40);}catch{/* Undecodable provider verification remains unverified. */}trace={requestHash:requestHash!,responseHash:digest(text),httpStatus:response.status,verificationStatus:status};}
   return response;
  };
  let result:{verified:boolean;transmissionId:string};try{result=await new PayPalWebhookVerifier(this.paypal,this.store.config.webhookId,bounded).verify(rawBody,headers);}catch{return this.store.rejected(attemptId,'verification_unavailable',trace);}
  if(!result.verified||result.transmissionId!==headers.get('paypal-transmission-id'))return this.store.rejected(attemptId,'rejected',trace);
  if(!trace) return this.store.rejected(attemptId,'verification_unavailable',null);
  return this.store.verified(attemptId,event,trace);
 }
}

export async function handleDelivery(request:Request,observer:DeliveryObserver):Promise<Response>{
 const reply=(status:number)=>Response.json({received:status===200},{status,headers:{'cache-control':'no-store'}});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415);
 const reader=request.body?.getReader();if(!reader)return reply(400);const parts:Uint8Array[]=[];let length=0;
 try{while(true){const item=await reader.read();if(item.done)break;length+=item.value.length;if(length>262144){await reader.cancel();return reply(413);}parts.push(item.value);}
  let raw:string;try{raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(parts));}catch{return reply(400);}
  return reply((await observer.ingest(raw,request.headers)).status);
 }catch(error){if(error instanceof z.ZodError||error instanceof SyntaxError||error instanceof Error&&['WEBHOOK_BODY_LIMIT','WEBHOOK_HEADERS'].includes(error.message))return reply(400);return reply(503);}
}
