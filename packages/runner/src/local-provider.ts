import { randomUUID } from "node:crypto";
import { canonicalJson, fromProviderMoney, sha256, toProviderMoney } from "@fracture/paypal-core";
import type { SqlConnection } from "@fracture/paypal-core";
import type { FixtureResource, FaultPlan } from "../../service/src/types";
import { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
type DocumentRow={document:string}&Record<string,unknown>;
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","paypal-debug-id":"sample-local-provider"}});
const refusal=(issue:string,status=422)=>response({name:"UNPROCESSABLE_ENTITY",message:"Local fixture refusal.",debug_id:"sample-local-provider",details:[{issue,description:"Controlled fixture response; no provider request was made."}]},status);

/** Persisted provider model. No request ever leaves this local transport. */
export class LocalPayPalTransport {
  constructor(readonly store:LabStore,readonly runId:string,readonly faults:FaultPlan,readonly leaseOwner?:string,readonly dispatchGuard?:((tx:SqlConnection)=>Promise<void>)|undefined){}
  readonly fetch:typeof fetch=async(input,init)=>{
    const request=input instanceof Request?input:new Request(input,init);if(request.signal.aborted)throw request.signal.reason;
    const url=new URL(request.url);if(url.origin!=="https://api-m.sandbox.paypal.com")throw new LabError("FIXTURE_HOST_DENIED","The fixture only accepts its declared endpoint.",403);
    if(url.pathname==="/v1/oauth2/token")return this.faults.authFailure?response({error:"invalid_client"},401):response({access_token:"sample-only-not-a-credential",token_type:"Bearer",expires_in:3600});
    const payload=request.method==="POST"?await this.parseBody(request):{};const requestId=request.headers.get("paypal-request-id");
    const attempt={id:randomUUID(),method:request.method,path:url.pathname,payloadHash:sha256(canonicalJson(payload)),providerRequestId:requestId,genericHeaderPresent:request.headers.has("idempotency-key"),source:"sample",transport:"local_fixture",createdAt:new Date().toISOString()};
    await this.store.db.query("INSERT INTO lab_target_attempts(id,run_id,created_at,document) VALUES($1,$2,$3,$4)",[attempt.id,this.runId,attempt.createdAt,JSON.stringify(attempt)]);
    if(this.faults.authFailure)return refusal("AUTHENTICATION_FAILURE",401);
    const identity=requestId?"stable" as const:"absent" as const;
    if(this.faults.unavailableReread&&request.method==="GET"&&await this.wasUsed("lost-capture-answer")){
      await this.store.emit(this.runId,{lane:"provider",kind:"resource_read_unavailable",title:"The reread is unavailable",detail:"The local fault blocks the target's lookup. Its outcome remains unknown.",identity,facts:{path:url.pathname,localFault:true}});throw new TypeError("Sample provider read unavailable");
    }
    if(request.method==="GET"){
      const resource=await this.resource(url.pathname.split("/").at(-1)??"");if(!resource)return refusal("RESOURCE_NOT_FOUND",404);
      await this.store.emit(this.runId,{lane:"provider",kind:"resource_read",title:`Read ${resource.kind}: ${resource.status}`,detail:`The authoritative local fixture returned ${resource.id}.`,resourceId:resource.id,facts:{resource,method:"GET",path:url.pathname}});return response(await this.wire(resource));
    }
    if(request.method!=="POST")return refusal("METHOD_NOT_ALLOWED",405);
    const create=url.pathname==="/v2/checkout/orders";const captureMatch=url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);const refundMatch=url.pathname.match(/^\/v2\/payments\/captures\/([^/]+)\/refund$/);
    if(!create&&!captureMatch&&!refundMatch)return refusal("LOCAL_OPERATION_NOT_IMPLEMENTED",404);
    if(this.faults.policyDenial&&(captureMatch||refundMatch)){await this.store.emit(this.runId,{lane:"lab",kind:"harness_safety_denied",title:"The experiment boundary blocked dispatch",detail:"The lab stopped this request. This cannot count as the target passing an invariant.",identity,facts:{path:url.pathname}});return refusal("HARNESS_SAFETY_DENIED",403);}
    let outcome:Awaited<ReturnType<LocalPayPalTransport["mutate"]>>;
    try{outcome=await this.mutate(url.pathname,payload,requestId,create,captureMatch?.[1],refundMatch?.[1]);}
    catch(error){if(!(error instanceof LabError)||!error.code.startsWith("CAMPAIGN_"))throw error;await this.store.emit(this.runId,{lane:"lab",kind:"harness_safety_denied",title:"Campaign authority stopped dispatch",detail:"The saved campaign no longer permits a new Sample request. This intervention cannot establish target correctness.",facts:{reason:error.code}});return refusal("HARNESS_SAFETY_DENIED",403);}
    if("error" in outcome)return refusal(outcome.error);
    const {resource,reused}=outcome;
    await this.store.emit(this.runId,{lane:"provider",kind:reused?"provider_request_reused":`${resource.kind}_${resource.status.toLowerCase()}`,title:reused?"Same request, same resource":resource.kind==="capture"?`Capture ${resource.status.toLowerCase()}`:resource.kind==="refund"?"Refund completed":"A new order exists",detail:resource.kind==="capture"?`${resource.money?.currency} ${resource.wireAmount.value} is recorded on ${resource.id}.`:`Resource ${resource.id} belongs to this purchase.`,identity,resourceId:resource.id,...(requestId?{requestId}:{}),facts:{resource,method:request.method,path:url.pathname,payloadHash:attempt.payloadHash,providerRequestIdPresent:Boolean(requestId),genericHeaderPresent:attempt.genericHeaderPresent,reused}});
    if(!reused&&resource.kind==="capture"&&(this.faults.dropCaptureResponse||this.faults.malformedSuccess)&&await this.consume("lost-capture-answer")){
      await this.store.emit(this.runId,{lane:"lab",kind:"response_dropped",title:this.faults.malformedSuccess?"The success body is malformed":"The answer disappears",detail:"The upstream fixture resource was persisted before this fault. The target has no usable answer.",resourceId:resource.id,identity,facts:{upstreamPersisted:true,targetReceived:false,faultSource:"local_fixture"}});
      if(this.faults.malformedSuccess)return new Response("{",{status:201,headers:{"content-type":"application/json"}});throw new TypeError("Sample connection reset after committed capture");
    }
    if(!reused&&resource.kind==="order"&&this.faults.dropCreateResponse&&await this.consume("lost-create-answer"))throw new TypeError("Sample connection reset after order creation");
    return response(await this.wire(resource.kind==="capture"?(await this.resource(resource.parentId!))!:resource),reused?200:201);
  };
  private async parseBody(request:Request):Promise<Record<string,unknown>>{const text=await request.text();if(!text)return {};try{const value:unknown=JSON.parse(text);if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("body");return value as Record<string,unknown>;}catch{throw new LabError("LOCAL_INVALID_JSON","Invalid fixture request JSON.");}}
  async resource(id:string,connection:SqlConnection=this.store.db):Promise<FixtureResource|null>{const result=await connection.query<DocumentRow>("SELECT document FROM lab_provider_resources WHERE run_id=$1 AND id=$2",[this.runId,id]);return result.rows[0]?JSON.parse(result.rows[0].document) as FixtureResource:null;}
  private async saveResource(resource:FixtureResource,connection:SqlConnection){await connection.query("INSERT INTO lab_provider_resources(run_id,id,kind,parent_id,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT(run_id,id) DO UPDATE SET document=$5",[this.runId,resource.id,resource.kind,resource.parentId,JSON.stringify(resource)]);}
  private async wire(resource:FixtureResource):Promise<Record<string,unknown>>{
    if(resource.kind!=="order")return {id:resource.id,status:resource.status,amount:resource.wireAmount,...(resource.customId?{custom_id:resource.customId}:{}),links:[]};
    const all=await this.store.resources(this.runId);const captures=all.filter(item=>item.kind==="capture"&&item.parentId===resource.id);const refunds=all.filter(item=>item.kind==="refund"&&captures.some(capture=>capture.id===item.parentId));
    return {id:resource.id,status:resource.status,intent:"CAPTURE",purchase_units:[{reference_id:"default",amount:resource.wireAmount,custom_id:resource.customId,payments:{captures:await Promise.all(captures.map(item=>this.wire(item))),refunds:await Promise.all(refunds.map(item=>this.wire(item)))}}],links:[]};
  }
  async approve(orderId:string){
    const approved=await this.store.db.transaction(async tx=>{
      if(this.dispatchGuard)await this.dispatchGuard(tx);
      const resource=await this.resource(orderId,tx);if(!resource||resource.kind!=="order")throw new LabError("ORDER_NOT_FOUND","Sample order not found.",404);if(resource.approved)return null;
      if(this.leaseOwner){const job=await tx.query<{lease_owner:string;lease_until:string;stage:string}&Record<string,unknown>>("SELECT lease_owner,lease_until,stage FROM lab_jobs WHERE id=$1 FOR UPDATE",[`execute:${this.runId}`]);const lease=job.rows[0];if(!lease||lease.lease_owner!==this.leaseOwner||lease.stage!=="running"||lease.lease_until<new Date().toISOString())throw new LabError("LEASE_LOST","The worker no longer owns this Sample approval.",409);}
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 FOR UPDATE",[this.runId]);if((await this.store.record(this.runId,undefined,tx)).cancelled)throw new LabError("HARNESS_CANCELLED","The Sample journey has been stopped.",409);
      await this.saveResource({...resource,status:"APPROVED",approved:true,observedAt:new Date().toISOString()},tx);return resource;
    });
    if(approved)await this.store.emit(this.runId,{lane:"customer",kind:"buyer_approved",title:"Maya approves this order",detail:`The scripted Sample buyer approves ${approved.wireAmount.currency_code} ${approved.wireAmount.value} for this distinct order.`,resourceId:approved.id,facts:{explicitSampleApproval:true}});
  }
  private async consume(key:string){const result=await this.store.db.query("INSERT INTO lab_faults(run_id,fault_key,document) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[this.runId,key,JSON.stringify({usedAt:new Date().toISOString(),source:"sample"})]);return result.rowCount===1;}
  private async wasUsed(key:string){return (await this.store.db.query("SELECT fault_key FROM lab_faults WHERE run_id=$1 AND fault_key=$2",[this.runId,key])).rowCount>0;}
  private async mutate(endpoint:string,payload:Record<string,unknown>,requestId:string|null,create:boolean,orderId?:string,captureId?:string):Promise<{resource:FixtureResource;reused:boolean}|{error:string}>{
    const run=await this.store.run(this.runId);const now=new Date().toISOString();const bodyHash=sha256(canonicalJson(payload));
    return this.store.db.transaction(async tx=>{
      if(this.dispatchGuard)await this.dispatchGuard(tx);
      if(this.leaseOwner){const lease=await tx.query<{lease_owner:string;lease_until:string;stage:string}&Record<string,unknown>>("SELECT lease_owner,lease_until,stage FROM lab_jobs WHERE id=$1 FOR UPDATE",[`execute:${this.runId}`]);const current=lease.rows[0];if(!current||current.lease_owner!==this.leaseOwner||current.stage!=="running"||current.lease_until<new Date().toISOString())throw new LabError("LEASE_LOST","The experiment worker no longer owns this dispatch.",409);}
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 FOR UPDATE",[this.runId]);
      const runRow=await this.store.record(this.runId,undefined,tx);if(runRow.cancelled)return {error:"HARNESS_CANCELLED"};
      if(requestId){const old=await tx.query<{resource_id:string;payload_hash:string}&Record<string,unknown>>("SELECT resource_id,payload_hash FROM lab_provider_requests WHERE run_id=$1 AND endpoint=$2 AND request_key=$3",[this.runId,endpoint,requestId]);if(old.rows[0]){if(old.rows[0].payload_hash!==bodyHash)return {error:"IDEMPOTENCY_PAYLOAD_CONFLICT"};const resource=await this.resource(old.rows[0].resource_id,tx);return resource?{resource,reused:true}:{error:"RESOURCE_NOT_FOUND"};}}
      let resource:FixtureResource;
      if(create){
        const units=payload.purchase_units as {amount?:{currency_code?:unknown;value?:unknown};custom_id?:unknown}[]|undefined;const unit=Array.isArray(units)&&units.length===1?units[0]:null;
        if(!unit?.amount||typeof unit.amount.currency_code!=="string"||typeof unit.amount.value!=="string")return {error:"INVALID_REQUEST"};
        const money=fromProviderMoney({currencyCode:unit.amount.currency_code,value:unit.amount.value});if(money.minor<=0)return {error:"INVALID_REQUEST"};
        resource={id:`SAMPLE-ORDER-${randomUUID().slice(0,12)}`,kind:"order",status:"CREATED",money,parentId:null,customId:typeof unit.custom_id==="string"?unit.custom_id:null,observedAt:now,createdAt:now,source:"sample",links:[],intentId:run.businessIntentId,approved:false,capturedMinor:0,refundedMinor:0,providerRequestId:requestId,wireAmount:{currency_code:money.currency,value:toProviderMoney(money).value}};
      }else if(orderId){
        const order=await this.resource(orderId,tx);if(!order||order.kind!=="order")return {error:"RESOURCE_NOT_FOUND"};if(order.status==="COMPLETED"||order.capturedMinor>0)return {error:"ORDER_ALREADY_CAPTURED"};if(!order.approved||order.status!=="APPROVED")return {error:"ORDER_NOT_APPROVED"};
        resource={...order,id:`SAMPLE-CAPTURE-${randomUUID().slice(0,12)}`,kind:"capture",parentId:order.id,status:this.faults.capturePending?"PENDING":"COMPLETED",observedAt:now,createdAt:now,providerRequestId:requestId,capturedMinor:this.faults.capturePending?0:order.money!.minor};
        await this.saveResource({...order,status:this.faults.capturePending?"APPROVED":"COMPLETED",capturedMinor:resource.capturedMinor,observedAt:now},tx);
      }else{
        const capture=await this.resource(captureId??"",tx);if(!capture||capture.kind!=="capture"||!capture.money)return {error:"RESOURCE_NOT_FOUND"};const amount=payload.amount as {currency_code?:unknown;value?:unknown}|undefined;
        if(!amount||typeof amount.currency_code!=="string"||typeof amount.value!=="string")return {error:"INVALID_REQUEST"};const money=fromProviderMoney({currencyCode:amount.currency_code,value:amount.value});
        if(!["COMPLETED","PARTIALLY_REFUNDED"].includes(capture.status)||money.currency!==capture.money.currency||money.minor<=0||money.minor>capture.money.minor-capture.refundedMinor)return {error:"REFUND_AMOUNT_EXCEEDED"};
        resource={...capture,id:`SAMPLE-REFUND-${randomUUID().slice(0,12)}`,kind:"refund",parentId:capture.id,status:"COMPLETED",money,wireAmount:{currency_code:money.currency,value:toProviderMoney(money).value},customId:typeof payload.custom_id==="string"?payload.custom_id:null,createdAt:now,observedAt:now,providerRequestId:requestId,refundedMinor:money.minor};
        await this.saveResource({...capture,refundedMinor:capture.refundedMinor+money.minor,status:capture.refundedMinor+money.minor===capture.money.minor?"REFUNDED":"PARTIALLY_REFUNDED",observedAt:now},tx);
      }
      await this.saveResource(resource,tx);if(requestId)await tx.query("INSERT INTO lab_provider_requests(run_id,endpoint,request_key,payload_hash,resource_id) VALUES($1,$2,$3,$4,$5)",[this.runId,endpoint,requestId,bodyHash,resource.id]);return {resource,reused:false};
    });
  }
}
