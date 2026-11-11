import { randomUUID } from 'node:crypto';
import { canonicalJson, sha256 } from '@fracture/paypal-core';
import type { SqlConnection, SqlDatabase } from '@fracture/paypal-core';
import { z } from 'zod';

const identifier = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const actionSchema = z.object({kind:z.enum(['create','authorize','capture_order','capture_authorization','refund','void']),intent:identifier,minor:z.number().int().min(0).max(1_000_000),resourceId:identifier.nullable(),authorize:z.boolean(),finalCapture:z.boolean(),currency:z.literal('USD')}).strict();
export type TandemAction = z.infer<typeof actionSchema>;
export interface TandemOperation {key:string;action:TandemAction;payloadHash:string;providerRequestId:string;authorityVersion:number;owner:string;status:'claimed'|'dispatching'|'unknown'|'not_sent'|'refused'|'succeeded';resourceId:string|null;code:string;evidence:Record<string,unknown>}
export interface TandemRun {id:string;sessionId:string;intent:string;minor:number;currency:'USD';version:number;revoked:boolean;expiresAt:string;sourceHash:string;source:'sample';ticket:{status:string;resourceId:string|null};faults:string[]}
export interface TandemResource {id:string;kind:'order'|'authorization'|'capture'|'refund';parentId:string|null;intent:string;minor:number;status:string;requestId:string|null;body:Record<string,unknown>}
interface DocumentRow extends Record<string,unknown>{document:unknown}
function doc<T>(row:DocumentRow):T{return (typeof row.document==='string'?JSON.parse(row.document):row.document) as T;}
export class TandemRefusal extends Error {constructor(readonly code:string){super(code);}}
function duplicate(error:unknown){return error!==null&&typeof error==='object'&&'code'in error&&error.code==='23505';}
export const tandemSchema = [
  `CREATE TABLE IF NOT EXISTS tandem_runs(id text PRIMARY KEY,session_id text NOT NULL,document jsonb NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tandem_operations(run_id text NOT NULL REFERENCES tandem_runs(id),business_key text NOT NULL,document jsonb NOT NULL,PRIMARY KEY(run_id,business_key))`,
  `CREATE TABLE IF NOT EXISTS tandem_resources(run_id text NOT NULL REFERENCES tandem_runs(id),id text NOT NULL,kind text NOT NULL,parent_id text,document jsonb NOT NULL,PRIMARY KEY(run_id,id))`,
  `CREATE TABLE IF NOT EXISTS tandem_provider_keys(run_id text NOT NULL,endpoint text NOT NULL,request_id text NOT NULL,payload_hash text NOT NULL,response jsonb NOT NULL,PRIMARY KEY(run_id,endpoint,request_id))`,
  `CREATE TABLE IF NOT EXISTS tandem_entitlements(id text PRIMARY KEY,run_id text NOT NULL,semantic_key text,document jsonb NOT NULL,UNIQUE(run_id,semantic_key))`,
  `CREATE TABLE IF NOT EXISTS tandem_events(sequence bigserial PRIMARY KEY,run_id text NOT NULL,kind text NOT NULL,document jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS tandem_faults(run_id text NOT NULL,fault text NOT NULL,PRIMARY KEY(run_id,fault))`,
];
export class TandemStore {
  constructor(readonly db:SqlDatabase,readonly sessionId:string,readonly runId:string){}
  async initialize(){for(const sql of tandemSchema)await this.db.query(sql);}
  async create(input:Omit<TandemRun,'id'|'sessionId'|'version'|'revoked'|'ticket'|'source'|'currency'>){
    if(!identifier.safeParse(input.intent).success||!Number.isSafeInteger(input.minor)||input.minor<=0||input.minor>1_000_000||!Number.isFinite(Date.parse(input.expiresAt)))throw new TandemRefusal('INVALID_RUN');
    const run:TandemRun={...input,id:this.runId,sessionId:this.sessionId,version:1,revoked:false,source:'sample',currency:'USD',ticket:{status:'ready',resourceId:null}};
    await this.db.query('INSERT INTO tandem_runs(id,session_id,document) VALUES($1,$2,$3::jsonb)',[this.runId,this.sessionId,JSON.stringify(run)]);return run;
  }
  async run(tx:SqlConnection=this.db,lock=false){const row=(await tx.query<DocumentRow>(`SELECT document FROM tandem_runs WHERE id=$1 AND session_id=$2${lock?' FOR UPDATE':''}`,[this.runId,this.sessionId])).rows[0];if(!row)throw new TandemRefusal('RUN_NOT_OWNED');return doc<TandemRun>(row);}
  async authority(tx:SqlConnection=this.db){const run=await this.run(tx);return {allowed:!run.revoked&&Date.parse(run.expiresAt)>Date.now(),version:run.version,intent:run.intent,minor:run.minor};}
  async revoke(){await this.db.transaction(async tx=>{const run=await this.run(tx,true);run.revoked=true;run.version++;await this.saveRun(run,tx);});}
  async saveRun(run:TandemRun,tx:SqlConnection){await tx.query('UPDATE tandem_runs SET document=$3::jsonb WHERE id=$1 AND session_id=$2',[this.runId,this.sessionId,JSON.stringify(run)]);}
  async event(kind:string,document:unknown,tx:SqlConnection=this.db){await tx.query('INSERT INTO tandem_events(run_id,kind,document) VALUES($1,$2,$3::jsonb)',[this.runId,kind,JSON.stringify(document)]);}
  async operations(tx:SqlConnection=this.db){await this.run(tx);return (await tx.query<DocumentRow>('SELECT document FROM tandem_operations WHERE run_id=$1',[this.runId])).rows.map(row=>doc<TandemOperation>(row));}
  async operation(key:string,tx:SqlConnection=this.db){return (await this.operations(tx)).find(value=>value.key===key)??null;}
  async resources(tx:SqlConnection=this.db){await this.run(tx);return (await tx.query<DocumentRow>('SELECT document FROM tandem_resources WHERE run_id=$1 ORDER BY id',[this.runId])).rows.map(row=>doc<TandemResource>(row));}
  async saveResource(resource:TandemResource,tx:SqlConnection){await tx.query('INSERT INTO tandem_resources(run_id,id,kind,parent_id,document) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(run_id,id) DO UPDATE SET document=EXCLUDED.document',[this.runId,resource.id,resource.kind,resource.parentId,JSON.stringify(resource)]);}
  async claim(key:string,input:unknown,authorityVersion:number,owner:string){
    if(!/^[A-Za-z0-9_:-]{1,100}$/.test(key))throw new TandemRefusal('INVALID_OPERATION_KEY');
    const action=actionSchema.parse(input),hash=sha256(canonicalJson(action));
    const operation:TandemOperation={key,action,payloadHash:hash,providerRequestId:`TD-${sha256(`${this.runId}:${key}`).slice(0,32)}`,authorityVersion,owner,status:'claimed',resourceId:null,code:'CLAIMED',evidence:{}};
    try {
      await this.db.transaction(async tx=>{
        const run=await this.run(tx,true),authority=await this.authority(tx);
        if(!authority.allowed||authorityVersion!==run.version||action.intent!==run.intent)throw new TandemRefusal('AUTHORITY_CHANGED');
        // INSERT is the rejecting claim. PostgreSQL 23505 rolls back this whole
        // transaction; only then may the loser load the prior operation.
        await tx.query('INSERT INTO tandem_operations(run_id,business_key,document) VALUES($1,$2,$3::jsonb)',[this.runId,key,JSON.stringify(operation)]);
        const resources=await this.resources(tx),ops=await this.operations(tx);
        const parent=resources.find(resource=>resource.id===action.resourceId);
        if(action.kind==='create'&&(action.minor!==run.minor||action.resourceId!==null))throw new TandemRefusal('PURCHASE_CHANGED');
        if(action.kind!=='create'&&(!parent||parent.intent!==run.intent))throw new TandemRefusal('ORIGINAL_RESOURCE_NOT_OWNED');
        const expectedKind=action.kind==='authorize'||action.kind==='capture_order'?'order':action.kind==='refund'?'capture':'authorization';
        if(parent&&parent.kind!==expectedKind)throw new TandemRefusal('RESOURCE_KIND_MISMATCH');
        if(action.kind==='authorize'||action.kind==='capture_order'){if(parent?.minor!==action.minor)throw new TandemRefusal('AMOUNT_CHANGED');}
        if(action.kind==='capture_authorization'||action.kind==='refund'){
          if(!parent||action.minor<=0||action.kind==='capture_authorization'&&['VOIDED','CAPTURED','DENIED'].includes(parent.status))throw new TandemRefusal('RESOURCE_CLOSED');
          const childKind=action.kind==='refund'?'refund':'capture';
          const effects=resources.filter(r=>r.kind===childKind&&r.parentId===parent.id&&['COMPLETED','PENDING','REFUNDED','PARTIALLY_REFUNDED'].includes(r.status));
          const knownIds=new Set(effects.map(r=>r.id));
          const reserved=ops.filter(op=>op.action.kind===action.kind&&op.action.resourceId===parent.id&&!['refused','not_sent'].includes(op.status)&&(!op.resourceId||!knownIds.has(op.resourceId))).reduce((n,op)=>n+op.action.minor,0);
          const used=effects.reduce((n,r)=>n+r.minor,0);
          if(used+reserved>parent.minor)throw new TandemRefusal('REMAINDER_RESERVED');
        }
        await this.event('target.operation_claimed',{key,kind:action.kind,minor:action.minor,payloadHash:hash,providerRequestId:operation.providerRequestId},tx);
      });
      return {claimed:true,operation};
    } catch(error){
      if(!duplicate(error))throw error;
      const prior=await this.operation(key);if(!prior||prior.payloadHash!==hash)throw new TandemRefusal('OPERATION_PAYLOAD_CHANGED');
      return {claimed:false,code:'DUPLICATE_CLAIM',operation:prior};
    }
  }
  async record(key:string,phase:'dispatching'|'observed',owner:string,result?:unknown){
    return this.db.transaction(async tx=>{
      const run=await this.run(tx,true),operation=await this.operation(key,tx);if(!operation)throw new TandemRefusal('OPERATION_MISSING');
      if(phase==='dispatching'){
        if(operation.owner!==owner||operation.status!=='claimed')throw new TandemRefusal('DISPATCH_NOT_OWNED');
        if(run.revoked||run.version!==operation.authorityVersion||Date.parse(run.expiresAt)<=Date.now())throw new TandemRefusal('AUTHORITY_CHANGED');
        operation.status='dispatching';operation.code='DISPATCHING';
      } else {
        const value=z.object({status:z.enum(['unknown','not_sent','refused','succeeded']),code:z.string().regex(/^[A-Z_]{1,80}$/),resourceId:identifier.nullable(),evidence:z.record(z.string(),z.unknown())}).strict().parse(result);
        if(['not_sent','refused','succeeded'].includes(operation.status))return {operation};
        if(operation.status==='claimed'||operation.owner!==owner&&value.status!=='unknown'&&value.status!=='succeeded')throw new TandemRefusal('RESULT_NOT_OWNED');
        if(value.resourceId){const resource=(await this.resources(tx)).find(r=>r.id===value.resourceId);if(!resource)throw new TandemRefusal('RESULT_RESOURCE_NOT_OWNED');}
        operation.status=value.status;operation.code=value.code;operation.resourceId=value.resourceId??operation.resourceId;operation.evidence=value.evidence;
      }
      await tx.query('UPDATE tandem_operations SET document=$3::jsonb WHERE run_id=$1 AND business_key=$2',[this.runId,key,JSON.stringify(operation)]);
      await this.event(`target.operation_${operation.status}`,{key,resourceId:operation.resourceId,code:operation.code},tx);return {operation};
    });
  }
  async ticket(input:unknown){const value=z.object({status:z.enum(['ready','failed','checking','reserved','paid','refunded']),resourceId:identifier.nullable(),preserveCompleted:z.boolean().default(false)}).strict().parse(input);return this.db.transaction(async tx=>{const run=await this.run(tx,true);if(value.preserveCompleted&&run.ticket.status==='paid'&&['ready','failed','checking'].includes(value.status))return run.ticket;run.ticket={status:value.status,resourceId:value.resourceId};await this.saveRun(run,tx);await this.event('target.ticket_projection',run.ticket,tx);return run.ticket;});}
  async entitlement(input:unknown){
    const value=z.object({key:identifier,captureId:identifier,minor:z.number().int().positive(),deduplicate:z.boolean()}).strict().parse(input);
    // These are explicitly target-owned primitives. The faulty target asks for
    // an unconstrained insert; the observer must retain that defect as evidence.
    return this.db.transaction(async tx=>{
      await this.run(tx,true);const resource=(await this.resources(tx)).find(r=>r.id===value.captureId&&r.kind==='capture');if(!resource)throw new TandemRefusal('CAPTURE_NOT_OWNED');
      const id=randomUUID();const row=await tx.query('INSERT INTO tandem_entitlements(id,run_id,semantic_key,document) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(run_id,semantic_key) DO NOTHING RETURNING id',[id,this.runId,value.deduplicate?value.key:null,JSON.stringify(value)]);
      await this.event(row.rowCount?'target.ticket_issued':'target.ticket_reused',{captureId:resource.id,deduplicate:value.deduplicate},tx);return {created:!!row.rowCount};
    });
  }
  async snapshot(){const run=await this.run(),resources=await this.resources(),operations=await this.operations();const entitlements=(await this.db.query<DocumentRow>('SELECT document FROM tandem_entitlements WHERE run_id=$1',[this.runId])).rows.map(row=>doc<Record<string,unknown>>(row));const events=(await this.db.query<{sequence:string;kind:string;document:unknown}&Record<string,unknown>>('SELECT sequence,kind,document FROM tandem_events WHERE run_id=$1 ORDER BY sequence',[this.runId])).rows;return {run,resources,operations,entitlements,events};}
}
