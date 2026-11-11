import Database from "better-sqlite3";
import {createHash} from "node:crypto";
import {canonical, digest} from "./protocol";

export type Data=Record<string, any>;
export interface WireRequest {method:string;path:string;headers:Record<string,string>;body:unknown}
export interface WireReply {status:number;body:unknown;failure?:"lost"|"not_sent";rawBody?:string}
export interface Resource {id:string;intentKey:string;amountMinor:number;currency:string;status:string;orderId?:string;captureId?:string;customId?:string}
export interface Fault {method:string;path:string;kind:"lost"|"malformed"|"missing"|"pending"|"refused"|"read_unavailable"|"not_sent";remaining:number;status?:number;issue?:string;replyBody?:unknown}
export interface Observation {sequence:number;actor:string;kind:string;input:Data;result:unknown;rowsAtDispatch?:Array<{table:string;key:string;value:Data}>}
export class StoreFailure extends Error {constructor(public code:string){super(code);}}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const money=(r:Resource)=>({currency_code:r.currency,value:`${Math.floor(r.amountMinor/100)}.${String(r.amountMinor%100).padStart(2,"0")}`});
function cents(value:unknown):number|null {if(typeof value!=="string"||!/^\d+\.\d{2}$/.test(value))return null;const [a,b]=value.split('.');const n=Number(a)*100+Number(b);return Number.isSafeInteger(n)&&n>0?n:null;}
const refusal=(status:number,issue:string):WireReply=>({status,body:{name:status===404?"RESOURCE_NOT_FOUND":"UNPROCESSABLE_ENTITY",message:issue,debug_id:"sample-evaluation-debug",details:[{issue,description:issue}]}});

/** Trusted deterministic payment observer. Never imported by or mounted into a candidate. */
export class EvaluationWorld {
  readonly db:Database.Database;
  readonly orders=new Map<string,Resource>(); readonly captures=new Map<string,Resource>(); readonly refunds=new Map<string,Resource>();
  readonly observations:Observation[]=[]; readonly identities=new Map<string,{payload:string;reply:WireReply}>();
  readonly signatures=new Set<string>(); faults:Fault[]=[]; oauthStatus=200; private sequence=0;private serial=0;
  operationFaults:Array<Omit<Fault,'method'|'path'>&{operation:'create'|'capture'|'refund'}>=[];
  storeFaults:Array<{method:string;table:string;key?:string;code:string;remaining:number}>=[];
  constructor(path:string){this.db=new Database(path);this.db.pragma('journal_mode = WAL');this.db.exec('CREATE TABLE target_rows(id INTEGER PRIMARY KEY, table_name TEXT NOT NULL, row_key TEXT NOT NULL, document TEXT NOT NULL, version INTEGER NOT NULL, UNIQUE(table_name,row_key))');}
  close(){this.db.close();}
  seed(table:string,key:string,value:Data){this.db.prepare('INSERT INTO target_rows(table_name,row_key,document,version) VALUES(?,?,?,1)').run(table,key,JSON.stringify(value));}
  rows(table?:string):Array<{table:string;key:string;value:Data}>{const raw=(table?this.db.prepare('SELECT table_name,row_key,document,version FROM target_rows WHERE table_name=? ORDER BY row_key').all(table):this.db.prepare('SELECT table_name,row_key,document,version FROM target_rows ORDER BY table_name,row_key').all()) as Array<{table_name:string;row_key:string;document:string;version:number}>;return raw.map(r=>({table:r.table_name,key:r.row_key,value:{...JSON.parse(r.document),version:r.version}}));}
  get(table:string,key:string){return this.rows(table).find(r=>r.key===key)?.value??null;}
  record(actor:string,kind:string,input:Data,result:unknown,dispatch=false){const record:Observation={sequence:++this.sequence,actor,kind,input:copy(input),result:copy(result)};if(dispatch)record.rowsAtDispatch=this.rows();this.observations.push(record);return result;}
  addOrder(intentKey:string,id:string,amountMinor=1200,status="APPROVED",currency="USD"){this.orders.set(id,{id,intentKey,amountMinor,currency,status});return id;}
  addCapture(intentKey:string,id:string,amountMinor=1200,orderId="order-original",status="COMPLETED"){if(!this.orders.has(orderId))this.addOrder(intentKey,orderId,amountMinor,"COMPLETED");this.captures.set(id,{id,intentKey,amountMinor,currency:"USD",status,orderId});return id;}
  sign(event:Data){this.signatures.add(digest(canonical(event)));return event;}
  async rpc(actor:string,method:string,input:Data):Promise<unknown>{
    if(this.observations.length>=1600)throw new StoreFailure('CALL_LIMIT');
    if(method==='wire')return this.wire(actor,input as WireRequest);
    if(method==='verify'){const valid=this.signatures.has(digest(canonical(input)));return this.record(actor,'verify',{eventId:input.id},valid);}
    if(!/^store\.(get|list|insert|patch|remove|reserve)$/.test(method))throw new StoreFailure('CAPABILITY_DENIED');
    const table=method==='store.reserve'?'reservations':String(input.table??'');const key=String(input.key??'');
    if(!/^[a-z][a-z0-9_]{0,31}$/.test(table)||key.length>240||(!key&&method!=='store.list')||JSON.stringify(input).length>50000)throw new StoreFailure('STORE_INPUT');
    let result:unknown;
    try{
      const fault=this.storeFaults.find(f=>f.remaining>0&&f.method===method&&(f.table==='*'||f.table===table)&&(!f.key||f.key===key));if(fault){fault.remaining--;throw new StoreFailure(fault.code);}
      if(method==='store.get')result=this.get(table,key);
      else if(method==='store.list')result=this.rows(table).map(({key,value})=>({key,value}));
      else if(method==='store.remove'){this.db.prepare('DELETE FROM target_rows WHERE table_name=? AND row_key=?').run(table,key);result=null;}
      else if(method==='store.patch'){
        const row=this.get(table,key);if(!row)throw new StoreFailure('ROW_MISSING');
        if(input.expectedVersion!==undefined&&input.expectedVersion!==null&&row.version!==input.expectedVersion)throw new StoreFailure('VERSION_CONFLICT');
        const {version:_,...old}=row;const value={...old,...input.value};delete value.version;
        this.db.prepare('UPDATE target_rows SET document=?,version=version+1 WHERE table_name=? AND row_key=?').run(JSON.stringify(value),table,key);result=this.get(table,key);
      }else if(method==='store.reserve'){
        result=this.db.transaction(()=>{
          if(this.get(table,key))throw new StoreFailure('SQLITE_CONSTRAINT_UNIQUE');
          const amount=Number(input.amountMinor),limit=Number(input.limitMinor),resource=String(input.resource);
          if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(limit)||limit<0||!resource)throw new StoreFailure('INVALID_AMOUNT');
          const held=this.rows(table).filter(r=>r.value.resource===resource&&['held','unknown','pending','completed'].includes(r.value.state)).reduce((s,r)=>s+Number(r.value.amountMinor),0);
          if(held+amount>limit)throw new StoreFailure('CAPACITY_EXCEEDED');
          this.seed(table,key,{...input.metadata,resource,amountMinor:amount,state:'held'});return this.get(table,key);
        })();
      }else {const value={...input.value};delete value.version;this.seed(table,key,value);result=this.get(table,key);}
      this.record(actor,method,input,result);return result;
    }catch(error){const code=error instanceof StoreFailure?error.code:typeof error==='object'&&error!==null&&'code'in error?String(error.code):'STORE_ERROR';this.record(actor,method,input,{error:code});throw new StoreFailure(code);}
  }
  private orderBody(r:Resource){return {id:r.id,status:r.status,intent:"CAPTURE",purchase_units:[{custom_id:r.intentKey,amount:money(r),payments:{captures:[...this.captures.values()].filter(c=>c.orderId===r.id).map(c=>this.captureBody(c)),refunds:[...this.refunds.values()].filter(f=>this.captures.get(f.captureId??'')?.orderId===r.id).map(f=>this.refundBody(f))}}]};}
  private captureBody(r:Resource){const refunded=[...this.refunds.values()].filter(f=>f.captureId===r.id&&f.status==='COMPLETED').reduce((s,f)=>s+f.amountMinor,0);return {id:r.id,status:refunded>=r.amountMinor?'REFUNDED':refunded>0?'PARTIALLY_REFUNDED':r.status,amount:money(r),custom_id:r.intentKey,supplementary_data:{related_ids:{order_id:r.orderId}},seller_receivable_breakdown:{gross_amount:money(r)},links:[]};}
  private refundBody(r:Resource){return {id:r.id,status:r.status,amount:money(r),custom_id:r.customId??r.intentKey,links:[]};}
  private next(prefix:string){return `${prefix}-${String(++this.serial).padStart(5,'0')}`;}
  private wire(actor:string,input:WireRequest):WireReply {
    const {method,path,headers}=input;const body=input.body as Data|null;
    if(!['GET','POST'].includes(method)||!path.startsWith('/')||path.includes('?')||path.includes('..')||Object.keys(headers).some(k=>!['paypal-request-id','idempotency-key','prefer','content-type','accept'].includes(k)))throw new StoreFailure('WIRE_CAPABILITY_DENIED');
    const operation=path==='/v2/checkout/orders'?'create':path.endsWith('/capture')?'capture':path.endsWith('/refund')?'refund':null;
    const fault=this.faults.find(f=>f.remaining>0&&f.method===method&&(f.path===path||f.path==='*'))??(method==='POST'?this.operationFaults.find(f=>f.remaining>0&&f.operation===operation):undefined);if(fault)fault.remaining--;
    if(fault?.kind==='not_sent')return this.record(actor,'wire',{...input},{status:0,body:null,failure:'not_sent'}) as WireReply;
    if(path==='/v1/oauth2/token'){const reply=this.oauthStatus===200?{status:200,body:{access_token:'FICTIONAL-OFFLINE-TOKEN',token_type:'Bearer',expires_in:3600}}:{status:this.oauthStatus,body:{error:'invalid_client'}};this.record(actor,'oauth',{method,path},{status:reply.status,fictionalOfflineCredential:true});return reply;}
    const requestKey=headers['paypal-request-id'];const identity=requestKey?`${method}:${path}:${requestKey}`:null;
    if(method==='POST'&&identity&&this.identities.has(identity)){const old=this.identities.get(identity)!;const reply=old.payload===canonical(body)?copy(old.reply):refusal(422,'REQUEST_ID_PAYLOAD_MISMATCH');return this.record(actor,'wire',{...input},reply,true) as WireReply;}
    if(fault?.kind==='refused'||fault?.kind==='read_unavailable'){const reply=refusal(fault.status??(fault.kind==='refused'?422:503),fault.issue??'TEMPORARY_UNAVAILABLE');if(fault.replyBody!==undefined)reply.body=fault.replyBody;return this.record(actor,'wire',{...input},reply,method==='POST') as WireReply;}
    let reply:WireReply;
    if(method==='POST'&&path==='/v2/checkout/orders'){
      const unit=body?.purchase_units?.[0] as Data|undefined;const minor=cents(unit?.amount?.value),intentKey=String(unit?.custom_id??'');
      if(!minor||unit?.amount?.currency_code!=='USD'||body?.intent!=='CAPTURE'||!this.get('intents',intentKey))reply=refusal(422,'INVALID_PURCHASE');
      else {const id=this.next('ORDER');this.addOrder(intentKey,id,minor,'APPROVED');reply={status:201,body:this.orderBody(this.orders.get(id)!)};}
    }else if(method==='GET'&&/^\/v2\/checkout\/orders\/[^/]+$/.test(path)){
      const r=this.orders.get(decodeURIComponent(path.split('/').at(-1)!));reply=r?{status:200,body:this.orderBody(r)}:refusal(404,'RESOURCE_NOT_FOUND');
    }else if(method==='POST'&&/^\/v2\/checkout\/orders\/[^/]+\/capture$/.test(path)){
      const order=this.orders.get(decodeURIComponent(path.split('/').at(-2)!));
      if(!order)reply=refusal(404,'RESOURCE_NOT_FOUND');else if(order.status!=='APPROVED')reply=refusal(422,order.status==='COMPLETED'?'ORDER_ALREADY_CAPTURED':'ORDER_NOT_APPROVED');
      else {const id=this.next('CAPTURE');this.addCapture(order.intentKey,id,order.amountMinor,order.id,fault?.kind==='pending'?'PENDING':'COMPLETED');order.status='COMPLETED';reply={status:201,body:this.orderBody(order)};}
    }else if(method==='GET'&&/^\/v2\/payments\/captures\/[^/]+$/.test(path)){
      const r=this.captures.get(decodeURIComponent(path.split('/').at(-1)!));reply=r?{status:200,body:this.captureBody(r)}:refusal(404,'RESOURCE_NOT_FOUND');
    }else if(method==='POST'&&/^\/v2\/payments\/captures\/[^/]+\/refund$/.test(path)){
      const capture=this.captures.get(decodeURIComponent(path.split('/').at(-2)!));const minor=cents(body?.amount?.value);
      const consumed=[...this.refunds.values()].filter(r=>r.captureId===capture?.id&&['PENDING','COMPLETED'].includes(r.status)).reduce((s,r)=>s+r.amountMinor,0);
      if(!capture)reply=refusal(404,'RESOURCE_NOT_FOUND');else if(capture.status!=='COMPLETED')reply=refusal(422,'CAPTURE_NOT_COMPLETED');else if(!minor||body?.amount?.currency_code!==capture.currency||minor+consumed>capture.amountMinor)reply=refusal(422,'REFUND_EXCEEDS_CAPTURE');
      else {const id=this.next('REFUND');const r:Resource={id,intentKey:capture.intentKey,captureId:capture.id,amountMinor:minor,currency:capture.currency,status:fault?.kind==='pending'?'PENDING':'COMPLETED',customId:String(body?.custom_id??'')};this.refunds.set(id,r);reply={status:201,body:this.refundBody(r)};}
    }else if(method==='GET'&&/^\/v2\/payments\/refunds\/[^/]+$/.test(path)){
      const r=this.refunds.get(decodeURIComponent(path.split('/').at(-1)!));reply=r?{status:200,body:this.refundBody(r)}:refusal(404,'RESOURCE_NOT_FOUND');
    }else throw new StoreFailure('WIRE_CAPABILITY_DENIED');
    if(identity&&method==='POST'&&reply.status>=200&&reply.status<300)this.identities.set(identity,{payload:canonical(body),reply:copy(reply)});
    this.record(actor,'wire',{...input},reply,method==='POST');
    if(fault&&['lost','malformed','missing','pending'].includes(fault.kind))this.record(actor,'injected-fault',{method,path,kind:fault.kind},{providerStatus:reply.status});
    if(fault?.kind==='lost'&&reply.status<300)return {status:0,body:null,failure:'lost'};
    if(fault?.kind==='malformed'&&reply.status<300)return {status:reply.status,body:null,rawBody:'{"id":123,"status":[]}' };
    if(fault?.kind==='missing'&&reply.status<300)return {status:reply.status,body:{}};
    return reply;
  }
  snapshot(){return {orders:[...this.orders.values()],captures:[...this.captures.values()],refunds:[...this.refunds.values()],rows:this.rows(),observations:this.observations};}
}

export function deterministicRequestId(...parts:string[]){const h=createHash('sha256').update(JSON.stringify(parts)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
