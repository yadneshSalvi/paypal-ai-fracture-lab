import type { SqlConnection, SqlDatabase } from "./sql.js";
import { PaymentError } from "./types.js";
import type { PaymentCommand, PaymentScope, PaymentStore, PaymentOperation, OperationStatus, ProviderReceipt, PaymentAttempt, ResourceReservation, WebhookDelivery } from "./types.js";

const schema=[
  `CREATE TABLE IF NOT EXISTS paycore_operations (id TEXT NOT NULL,tenant_id TEXT NOT NULL,project_id TEXT NOT NULL,business_key TEXT NOT NULL,provider_request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL,reservation_key TEXT,amount_minor BIGINT NOT NULL,provider_effect_id TEXT,document TEXT NOT NULL,PRIMARY KEY(tenant_id,project_id,id),UNIQUE(tenant_id,project_id,business_key))`,
  `CREATE TABLE IF NOT EXISTS paycore_resource_locks (tenant_id TEXT NOT NULL,project_id TEXT NOT NULL,resource_key TEXT NOT NULL,PRIMARY KEY(tenant_id,project_id,resource_key))`,
  `CREATE TABLE IF NOT EXISTS paycore_attempts (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,project_id TEXT NOT NULL,operation_id TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS paycore_webhook_events (tenant_id TEXT NOT NULL,project_id TEXT NOT NULL,event_id TEXT NOT NULL,body_hash TEXT NOT NULL,status TEXT NOT NULL,document TEXT NOT NULL,PRIMARY KEY(tenant_id,project_id,event_id))`,
  `CREATE TABLE IF NOT EXISTS paycore_webhook_deliveries (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,project_id TEXT NOT NULL,event_id TEXT NOT NULL,verified INTEGER NOT NULL,document TEXT NOT NULL)`
];
type OperationRow={id:string;tenant_id:string;project_id:string;document:string;payload_hash:string;provider_effect_id:string|null;amount_minor:string|number}&Record<string,unknown>;
export interface OperationDocumentContext { scope:PaymentScope; operationId:string }
/** Implement authenticated encryption and bind all context fields as associated data. */
export interface OperationDocumentCodec {
  encode(plaintext:string,context:OperationDocumentContext):string;
  decode(ciphertext:string,context:OperationDocumentContext):string;
}
export interface SqlPaymentStoreOptions { operationDocumentCodec?:OperationDocumentCodec }
const duplicateCode=(error:unknown)=>typeof error==="object"&&error!==null&&"code" in error&&["23505","SQLITE_CONSTRAINT_UNIQUE","SQLITE_CONSTRAINT_PRIMARYKEY"].includes(String(error.code));

export class SqlPaymentStore implements PaymentStore {
  constructor(readonly db:SqlDatabase,private readonly options:SqlPaymentStoreOptions={}){}
  private encode(operation:PaymentOperation):string {
    const plaintext=JSON.stringify(operation),codec=this.options.operationDocumentCodec;
    if(!codec)return plaintext;
    try {
      const ciphertext=codec.encode(plaintext,{scope:operation.command.scope,operationId:operation.command.operationId});
      if(typeof ciphertext!=="string"||!ciphertext||ciphertext===plaintext)throw new Error("Invalid codec output");
      return JSON.stringify({paycoreEncoding:"operation-v1",ciphertext});
    }catch{throw new PaymentError("OPERATION_DOCUMENT_UNAVAILABLE","The private payment operation could not be stored.",500);}
  }
  private parse(row:OperationRow):PaymentOperation {
    try {
      let document=JSON.parse(row.document);
      if(document&&typeof document==="object"&&"paycoreEncoding" in document){
        const codec=this.options.operationDocumentCodec;
        if(document.paycoreEncoding!=="operation-v1"||typeof document.ciphertext!=="string"||!codec)throw new Error("Unsupported encoding");
        document=JSON.parse(codec.decode(document.ciphertext,{scope:{tenantId:row.tenant_id,projectId:row.project_id},operationId:row.id}));
      }
      const operation=document as PaymentOperation,command=operation.command;
      if(command.operationId!==row.id||command.scope.tenantId!==row.tenant_id||command.scope.projectId!==row.project_id||command.payloadHash!==row.payload_hash)throw new Error("Row identity mismatch");
      return operation;
    }catch{throw new PaymentError("OPERATION_DOCUMENT_UNAVAILABLE","The private payment operation could not be opened.",500);}
  }
  async initialize(){
    for(const sql of schema)await this.db.query(sql);
    // Upgrade the pre-release schema without deleting operation history.
    if(this.db.dialect==="postgres")await this.db.query("ALTER TABLE paycore_operations ADD COLUMN IF NOT EXISTS provider_request_id TEXT");
    else {const columns=await this.db.query<{name:string}&Record<string,unknown>>("PRAGMA table_info(paycore_operations)");if(!columns.rows.some(column=>column.name==="provider_request_id"))await this.db.query("ALTER TABLE paycore_operations ADD COLUMN provider_request_id TEXT");}
    const missing=await this.db.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE provider_request_id IS NULL");
    for(const row of missing.rows){const command=this.parse(row).command;await this.db.query("UPDATE paycore_operations SET provider_request_id=$4 WHERE tenant_id=$1 AND project_id=$2 AND id=$3",[command.scope.tenantId,command.scope.projectId,command.operationId,command.providerRequestId]);}
    await this.db.query("CREATE UNIQUE INDEX IF NOT EXISTS paycore_provider_identity ON paycore_operations(tenant_id,project_id,provider_request_id)");
  }
  async get(scope:PaymentScope,id:string):Promise<PaymentOperation|null>{const result=await this.db.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND id=$3",[scope.tenantId,scope.projectId,id]);return result.rows[0]?this.parse(result.rows[0]):null;}
  private async reserve(tx:SqlConnection,command:PaymentCommand,reservation?:ResourceReservation){
    if(!reservation)return;
    if(!Number.isSafeInteger(reservation.totalMinor)||!Number.isSafeInteger(reservation.externallyConsumedMinor)||reservation.totalMinor<0||reservation.externallyConsumedMinor<0||reservation.currency!==command.action.money.currency)throw new PaymentError("INVALID_RESERVATION","Authoritative reservation budget is invalid.");
    const age=Date.now()-Date.parse(reservation.observedAt);
    if(!Number.isFinite(age)||age>60000||age< -30000)throw new PaymentError("STALE_RESOURCE_BUDGET","Refresh the provider resource budget before payment.");
    const p=[command.scope.tenantId,command.scope.projectId,reservation.resourceKey];
    await tx.query("INSERT INTO paycore_resource_locks(tenant_id,project_id,resource_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",p);
    await tx.query("SELECT resource_key FROM paycore_resource_locks WHERE tenant_id=$1 AND project_id=$2 AND resource_key=$3 FOR UPDATE",p);
    const active=await tx.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND reservation_key=$3 AND status IN ('claimed','dispatching','pending_reconciliation','succeeded')",p);
    if(active.rows.some(row=>{const existing=this.parse(row);return existing.command.operationId===command.operationId||existing.command.businessKey===command.businessKey;}))throw Object.assign(new Error("Duplicate semantic operation"),{code:tx.dialect==="postgres"?"23505":"SQLITE_CONSTRAINT_UNIQUE"});
    const unmatched=active.rows.filter(row=>!row.provider_effect_id||!reservation.observedProviderIds.includes(row.provider_effect_id)).reduce((sum,row)=>sum+Number(row.amount_minor),0);
    if(reservation.externallyConsumedMinor+unmatched+command.action.money.minor>reservation.totalMinor)throw new PaymentError("RESOURCE_BUDGET_EXCEEDED","The resource amount is already reserved or consumed.");
  }
  async claim(command:PaymentCommand,reservation?:ResourceReservation):Promise<{won:boolean;operation:PaymentOperation}>{
    const now=new Date().toISOString();
    const operation:PaymentOperation={command,status:"claimed",version:1,createdAt:now,updatedAt:now,leaseUntil:new Date(Date.now()+60000).toISOString(),receipt:null,error:null};
    try{
      await this.db.transaction(async tx=>{
        // A duplicate identity wins before checking money; a losing callback returns its winner.
        const prior=await tx.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND (business_key=$3 OR id=$4 OR provider_request_id=$5)",[command.scope.tenantId,command.scope.projectId,command.businessKey,command.operationId,command.providerRequestId]);
        if(prior.rows[0])throw Object.assign(new Error("Duplicate semantic operation"),{code:tx.dialect==="postgres"?"23505":"SQLITE_CONSTRAINT_UNIQUE"});
        await this.reserve(tx,command,reservation);
        await tx.query("INSERT INTO paycore_operations(id,tenant_id,project_id,business_key,payload_hash,status,version,reservation_key,amount_minor,provider_effect_id,document,provider_request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",[command.operationId,command.scope.tenantId,command.scope.projectId,command.businessKey,command.payloadHash,operation.status,operation.version,reservation?.resourceKey??null,command.action.money.minor,null,this.encode(operation),command.providerRequestId]);
      });
      return {won:true,operation};
    }catch(error){
      if(!duplicateCode(error))throw error;
      const result=await this.db.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND (business_key=$3 OR id=$4 OR provider_request_id=$5)",[command.scope.tenantId,command.scope.projectId,command.businessKey,command.operationId,command.providerRequestId]);
      const winner=result.rows[0];if(!winner)throw error;
      const existing=this.parse(winner);
      if(winner.payload_hash!==command.payloadHash||existing.command.intentId!==command.intentId||existing.command.businessKey!==command.businessKey)throw new PaymentError("PAYLOAD_CONFLICT","This business operation already exists with a different approved payload.");
      return {won:false,operation:existing};
    }
  }
  async reclaim(command:PaymentCommand,expectedVersion:number,reservation?:ResourceReservation):Promise<PaymentOperation>{
    return this.db.transaction(async tx=>{
      const result=await tx.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE",[command.scope.tenantId,command.scope.projectId,command.operationId]);
      const row=result.rows[0];if(!row)throw new PaymentError("NOT_FOUND","Payment operation not found.",404);
      const current=this.parse(row);
      if(current.version!==expectedVersion||!["refused","not_sent"].includes(current.status))throw new PaymentError("OPERATION_CHANGED","The operation changed; reload before retrying.");
      await this.reserve(tx,command,reservation);
      const next:PaymentOperation={...current,status:"claimed",version:current.version+1,updatedAt:new Date().toISOString(),receipt:null,error:null};
      await tx.query("UPDATE paycore_operations SET status=$4,version=$5,document=$6,reservation_key=$7 WHERE tenant_id=$1 AND project_id=$2 AND id=$3",[command.scope.tenantId,command.scope.projectId,command.operationId,next.status,next.version,this.encode(next),reservation?.resourceKey??null]);
      return next;
    });
  }
  async transition(scope:PaymentScope,id:string,expectedVersion:number,status:OperationStatus,receipt:ProviderReceipt|null,error:PaymentOperation["error"]):Promise<PaymentOperation>{
    return this.db.transaction(async tx=>{
      const result=await tx.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND id=$3 FOR UPDATE",[scope.tenantId,scope.projectId,id]);
      const row=result.rows[0];if(!row)throw new PaymentError("NOT_FOUND","Payment operation not found.",404);
      const current=this.parse(row);if(current.version!==expectedVersion)throw new PaymentError("OPERATION_CHANGED","The operation changed; reload canonical state.");
      const next:PaymentOperation={...current,status,version:current.version+1,updatedAt:new Date().toISOString(),receipt,error};
      const effect=receipt?.resources.find(resource=>resource.kind===(current.command.action.kind==="refund_capture"?"refund":"capture"))?.id??null;
      await tx.query("UPDATE paycore_operations SET status=$4,version=$5,document=$6,provider_effect_id=$7 WHERE tenant_id=$1 AND project_id=$2 AND id=$3",[scope.tenantId,scope.projectId,id,status,next.version,this.encode(next),effect]);
      return next;
    });
  }
  async attempt(scope:PaymentScope,attempt:PaymentAttempt){await this.db.query("INSERT INTO paycore_attempts(id,tenant_id,project_id,operation_id,document) VALUES($1,$2,$3,$4,$5)",[attempt.id,scope.tenantId,scope.projectId,attempt.operationId,JSON.stringify(attempt)]);}
  async list(scope:PaymentScope){const result=await this.db.query<OperationRow>("SELECT id,tenant_id,project_id,document,payload_hash,provider_effect_id,amount_minor FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 ORDER BY id",[scope.tenantId,scope.projectId]);return result.rows.map(row=>this.parse(row));}
  async recordWebhook(delivery:WebhookDelivery){
    return this.db.transaction(async tx=>{
      await tx.query("INSERT INTO paycore_webhook_deliveries(id,tenant_id,project_id,event_id,verified,document) VALUES($1,$2,$3,$4,$5,$6)",[delivery.id,delivery.scope.tenantId,delivery.scope.projectId,delivery.eventId,delivery.verified?1:0,JSON.stringify(delivery)]);
      if(!delivery.verified||!delivery.schemaValid)return {duplicate:false,eventId:delivery.eventId};
      const result=await tx.query("INSERT INTO paycore_webhook_events(tenant_id,project_id,event_id,body_hash,status,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",[delivery.scope.tenantId,delivery.scope.projectId,delivery.eventId,delivery.bodyHash,delivery.status,JSON.stringify(delivery)]);
      if(result.rowCount===0){const old=await tx.query<{body_hash:string}&Record<string,unknown>>("SELECT body_hash FROM paycore_webhook_events WHERE tenant_id=$1 AND project_id=$2 AND event_id=$3",[delivery.scope.tenantId,delivery.scope.projectId,delivery.eventId]);if(old.rows[0]?.body_hash!==delivery.bodyHash){const conflicted={...delivery,status:"dead_letter",rejectionReason:"canonical_payload_conflict"};await tx.query("UPDATE paycore_webhook_deliveries SET document=$2 WHERE id=$1",[delivery.id,JSON.stringify(conflicted)]);return {duplicate:true,eventId:delivery.eventId,conflict:true};}}
      return {duplicate:result.rowCount===0,eventId:delivery.eventId};
    });
  }
}
