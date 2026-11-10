import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { PAYPAL_CORE_VERSION } from "../packages/paypal-core/src/types.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "dotenv";
import { PaymentCore, SqlPaymentStore, PostgresDatabase, SqliteDatabase, PaymentError, ProviderError, payloadHash, sha256, toProviderMoney, fromProviderMoney, redact } from "../packages/paypal-core/src/index.js";
import type { PaymentAction, PaymentCommand, PaymentPolicy, ProviderAdapter, ProviderReceipt, PaymentOperation, PaymentScope, OperationStatus, SqlDatabase } from "../packages/paypal-core/src/index.js";

config({path:join(process.cwd(),".env"),quiet:true});
const adapters:("sqlite"|"postgres")[]=process.env.DATABASE_URL?["sqlite","postgres"]:["sqlite"];
test("runtime evidence version matches the immutable package metadata",async()=>{
  const manifest=JSON.parse(await readFile(new URL("../packages/paypal-core/package.json",import.meta.url),"utf8"));
  assert.equal(PAYPAL_CORE_VERSION,manifest.version);
});
function command(action:PaymentAction={kind:"capture_order",orderId:"ORDER-APPROVED",money:{currency:"USD",minor:1200}},scope:PaymentScope={tenantId:randomUUID(),projectId:"hardened-control"}):PaymentCommand {
  const id=randomUUID();return {scope,operationId:id,businessKey:`capture:${id}`,intentId:`intent:${id}`,providerRequestId:`request:${id}`,payloadHash:payloadHash(action),action,approval:{id:`approval:${id}`,version:1,digest:sha256(id),expiresAt:new Date(Date.now()+3600000).toISOString()}};
}
function receipt(cmd:PaymentCommand,status="COMPLETED"):ProviderReceipt {
  const action=cmd.action;const kind=action.kind==="create_order"?"order":action.kind==="refund_capture"?"refund":action.kind==="authorize_order"||action.kind==="void_authorization"?"authorization":"capture";
  return {id:randomUUID(),operationId:cmd.operationId,providerRequestId:cmd.providerRequestId,transport:"local_fixture",source:"sample",status:201,observedAt:new Date().toISOString(),resources:[{id:`EFFECT-${cmd.operationId}`,kind,status,money:action.money,parentId:"orderId" in action?action.orderId??null:null,customId:cmd.operationId,observedAt:new Date().toISOString(),source:"sample",links:[]}],debugId:null,bodyHash:sha256(cmd.operationId),reconciled:false};
}
function policy(overrides:Partial<Awaited<ReturnType<PaymentPolicy["authorize"]>>>={}):PaymentPolicy {
  return {authorize:async cmd=>({allowed:true,reason:"The current fixture approval grants this exact action.",resourceIds:["ORDER-APPROVED","CAPTURE-ELIGIBLE","AUTHORIZATION-APPROVED"],currency:cmd.action.money.currency,maximumMinor:1200,approvalId:cmd.approval.id,approvalVersion:cmd.approval.version,approvalDigest:cmd.approval.digest,...overrides})};
}
class FixtureProvider implements ProviderAdapter {
  readonly source="sample" as const;writes=0;reads=0;executeHook:((cmd:PaymentCommand)=>Promise<ProviderReceipt>)|null=null;reconcileHook:((op:PaymentOperation)=>Promise<ProviderReceipt|null>)|null=null;
  async execute(cmd:PaymentCommand){this.writes++;return this.executeHook?this.executeHook(cmd):receipt(cmd);}
  async reconcile(op:PaymentOperation){this.reads++;return this.reconcileHook?this.reconcileHook(op):null;}
  async read(){this.reads++;return [];}
}
async function database(t:TestContext,adapter:"sqlite"|"postgres"){
  const dir=await mkdtemp(join(tmpdir(),"fracture-core-"));
  const db:SqlDatabase=adapter==="postgres"?new PostgresDatabase(process.env.DATABASE_URL!):new SqliteDatabase(join(dir,"control.sqlite"));
  t.after(async()=>{await db.close();await rm(dir,{recursive:true,force:true});});
  const store=new SqlPaymentStore(db);await store.initialize();return {db,store,dir};
}
const isCode=(code:string)=>(error:unknown)=>error instanceof PaymentError&&error.code===code;

for(const adapter of adapters){
  test(`${adapter}: hardened control claims before outbound and concurrent duplicate callbacks dispatch once`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    provider.executeHook=async request=>{assert.equal((await store.get(request.scope,request.operationId))?.status,"dispatching");return receipt(request);};
    const core=new PaymentCore({store,provider,policy:policy()});
    await Promise.all(Array.from({length:16},()=>core.execute(cmd)));
    assert.equal(provider.writes,1);assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"succeeded");
    const changed={...cmd,action:{...cmd.action,money:{currency:"USD",minor:1300}} as PaymentAction};changed.payloadHash=payloadHash(changed.action);
    const broad=new PaymentCore({store,provider,policy:policy({maximumMinor:2000})});
    await assert.rejects(broad.execute(changed),isCode("PAYLOAD_CONFLICT"));assert.equal(provider.writes,1);
    const other={...command(undefined,cmd.scope),providerRequestId:cmd.providerRequestId};
    await assert.rejects(core.execute(other),isCode("PAYLOAD_CONFLICT"));assert.equal(provider.writes,1);
  });
  test(`${adapter}: lost write response reconciles the original operation without another write`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    provider.executeHook=async()=>{throw new ProviderError("connection","Fixture lost the answer.","unknown",502);};
    provider.reconcileHook=async op=>receipt(op.command);
    const core=new PaymentCore({store,provider,policy:policy()});const result=await core.execute(cmd);
    assert.equal(result.status,"succeeded");assert.equal(result.receipt?.reconciled,true);assert.equal(provider.writes,1);assert.equal(provider.reads,1);
    await core.execute(cmd);assert.equal(provider.writes,1);
  });
  test(`${adapter}: an unavailable reread remains unknown and blocks a retry`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    provider.executeHook=async()=>{throw new ProviderError("timeout","Fixture timeout.","unknown",502);};
    provider.reconcileHook=async()=>{throw new ProviderError("connection","Read unavailable.","unknown",502);};
    const core=new PaymentCore({store,provider,policy:policy()});assert.equal((await core.execute(cmd)).status,"pending_reconciliation");
    await assert.rejects(core.retry(cmd.scope,cmd.operationId),isCode("RECONCILIATION_REQUIRED"));assert.equal(provider.writes,1);
  });
  test(`${adapter}: never-sent authentication does not trigger a resource reread`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    provider.executeHook=async()=>{throw new ProviderError("auth","Authentication rejected before write.","not_sent",502);};
    const core=new PaymentCore({store,provider,policy:policy()});assert.equal((await core.execute(cmd)).status,"not_sent");assert.equal(provider.reads,0);
  });
  test(`${adapter}: pending and denied resource states never become completed money movement`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();
    for(const [state,expected] of [["PENDING","pending_reconciliation"],["DECLINED","refused"],["COMPLETED","succeeded"]] as const){
      const cmd=command();provider.executeHook=async request=>receipt(request,state);provider.reconcileHook=async op=>receipt(op.command,state);
      const core=new PaymentCore({store,provider,policy:policy()});assert.equal((await core.execute(cmd)).status,expected);assert.equal((await core.reconcile(cmd.scope,cmd.operationId)).status,expected);
    }
  });
  test(`${adapter}: two refund intents cannot reserve the same remaining money`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const scope={tenantId:randomUUID(),projectId:"refund-control"};
    const first=command({kind:"refund_capture",captureId:"CAPTURE-ELIGIBLE",money:{currency:"USD",minor:700}},scope);
    const second=command({kind:"refund_capture",captureId:"CAPTURE-ELIGIBLE",money:{currency:"USD",minor:600}},scope);
    const reservation={resourceKey:"capture:CAPTURE-ELIGIBLE",currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()};
    provider.executeHook=async cmd=>receipt(cmd,"PENDING");const core=new PaymentCore({store,provider,policy:policy({reservation})});
    const outcomes=await Promise.allSettled([core.execute(first),core.execute(second)]);
    assert.equal(outcomes.filter(result=>result.status==="fulfilled").length,1);assert.equal(provider.writes,1);
    const winner=outcomes.find(result=>result.status==="fulfilled");assert.equal(winner?.status==="fulfilled"?winner.value.status:null,"pending_reconciliation");
    const duplicate=await core.execute(winner!.status==="fulfilled"?winner!.value.command:first);assert.equal(duplicate.status,"pending_reconciliation");assert.equal(provider.writes,1);
  });
  test(`${adapter}: duplicate refund callbacks return their winner even while waiting for the resource lock`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();
    const cmd=command({kind:"refund_capture",captureId:"CAPTURE-ELIGIBLE",money:{currency:"USD",minor:1200}});
    const reservation={resourceKey:"capture:CAPTURE-ELIGIBLE",currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()};
    const core=new PaymentCore({store,provider,policy:policy({reservation})});await Promise.all(Array.from({length:8},()=>core.execute(cmd)));assert.equal(provider.writes,1);
  });
  test(`${adapter}: a pending refund reconciles only when the refund resource completes`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command({kind:"refund_capture",captureId:"CAPTURE-ELIGIBLE",money:{currency:"USD",minor:500}});
    const reservation={resourceKey:"capture:CAPTURE-ELIGIBLE",currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()};
    let state="PENDING";provider.executeHook=async request=>receipt(request,state);provider.reconcileHook=async op=>receipt(op.command,state);
    const core=new PaymentCore({store,provider,policy:policy({reservation})});assert.equal((await core.execute(cmd)).status,"pending_reconciliation");
    assert.equal((await core.reconcile(cmd.scope,cmd.operationId)).status,"pending_reconciliation");state="COMPLETED";assert.equal((await core.reconcile(cmd.scope,cmd.operationId)).status,"succeeded");assert.equal(provider.writes,1);
  });
  test(`${adapter}: SQL failure after provider success is recovered by a read, never another write`,async t=>{
    const {db}=await database(t,adapter);let injected=false;
    class FailingStore extends SqlPaymentStore {override async transition(scope:PaymentScope,id:string,version:number,status:OperationStatus,proof:ProviderReceipt|null,error:PaymentOperation["error"]){if(status==="succeeded"&&!injected){injected=true;throw new Error("injected SQL outage before commit");}return super.transition(scope,id,version,status,proof,error);}}
    const store=new FailingStore(db);const provider=new FixtureProvider();const cmd=command();provider.reconcileHook=async op=>receipt(op.command);
    const core=new PaymentCore({store,provider,policy:policy(),now:()=>new Date(Date.now()+120000)});
    await assert.rejects(core.execute(cmd),/injected SQL outage/);assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"dispatching");
    const recovered=await core.recover(cmd.scope);assert.equal(recovered[0]?.status,"succeeded");assert.equal(provider.writes,1);assert.equal(provider.reads,1);
  });
  test(`${adapter}: exact recovery resumes one policy's command without scanning or touching another policy in the same scope`,async t=>{
    const {db}=await database(t,adapter);
    class ExactStore extends SqlPaymentStore {override async list(_scope:PaymentScope):Promise<PaymentOperation[]>{throw new Error("Exact recovery must not enumerate a scope");}}
    const store=new ExactStore(db),provider=new FixtureProvider();
    const seed=command({kind:"create_order",intent:"CAPTURE",customId:"seed-owned",money:{currency:"USD",minor:1200}});
    const refund=command({kind:"refund_capture",captureId:"CAPTURE-ELIGIBLE",money:{currency:"USD",minor:500}},seed.scope);
    const reservation={resourceKey:"capture:CAPTURE-ELIGIBLE",currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()};
    await store.claim(seed);await store.claim(refund,reservation);
    const refundBefore=await store.get(refund.scope,refund.operationId);const seen:string[]=[];
    const seedPolicy:PaymentPolicy={authorize:async cmd=>{seen.push(cmd.operationId);return {...await policy().authorize(cmd),allowed:cmd.action.kind==="create_order"};}};
    const seedCore=new PaymentCore({store,provider,policy:seedPolicy,now:()=>new Date(Date.now()+120000)});
    const result=await seedCore.recoverOperation(seed.scope,seed.operationId);
    assert.equal(result.status,"succeeded");assert.deepEqual(seen,[seed.operationId]);assert.equal(provider.writes,1);
    assert.deepEqual(await store.get(refund.scope,refund.operationId),refundBefore);
    const refundPolicy:PaymentPolicy={authorize:async cmd=>({...await policy({reservation}).authorize(cmd),allowed:cmd.action.kind==="refund_capture"})};
    const refundCore=new PaymentCore({store,provider,policy:refundPolicy,now:()=>new Date(Date.now()+120000)});
    assert.equal((await refundCore.recoverOperation(refund.scope,refund.operationId)).status,"succeeded");
    assert.equal(provider.writes,2);assert.equal(provider.reads,0);
    assert.equal((await store.get(seed.scope,seed.operationId))?.command.providerRequestId,seed.providerRequestId);
  });
  test(`${adapter}: concurrent exact recovery returns the original SQL winner and dispatches once`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    await store.claim(cmd);
    const make=()=>new PaymentCore({store,provider,policy:policy(),now:()=>new Date(Date.now()+120000)});
    const cores=[make(),make()];
    const results=await Promise.all(Array.from({length:12},(_,index)=>cores[index%2]!.recoverOperation(cmd.scope,cmd.operationId)));
    assert.equal(provider.writes,1);assert(results.every(result=>result.command.operationId===cmd.operationId));
    assert(results.every(result=>result.command.providerRequestId===cmd.providerRequestId));
    assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"succeeded");
  });
  test(`${adapter}: exact recovery of an unknown outcome after expiry or revocation only reads its original resource`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();const unrelated=command(undefined,cmd.scope);
    provider.executeHook=async()=>{throw new ProviderError("connection","Lost write response","unknown",502);};
    const original=new PaymentCore({store,provider,policy:policy()});
    assert.equal((await original.execute(cmd)).status,"pending_reconciliation");
    assert.equal((await original.execute(unrelated)).status,"pending_reconciliation");
    const untouched=await store.get(unrelated.scope,unrelated.operationId);const reconciled:string[]=[];
    let resolved=false;
    provider.reconcileHook=async operation=>{reconciled.push(operation.command.operationId);return resolved?receipt(operation.command):null;};
    const denied:PaymentPolicy={authorize:async()=>{throw new Error("Unknown reconciliation must not acquire new write authority");}};
    const recovery=new PaymentCore({store,provider,policy:denied,now:()=>new Date(Date.now()+7200000)});
    assert.equal((await recovery.recoverOperation(cmd.scope,cmd.operationId)).status,"pending_reconciliation");
    assert.equal(provider.writes,2);assert.deepEqual(await store.get(unrelated.scope,unrelated.operationId),untouched);
    resolved=true;const result=await recovery.recoverOperation(cmd.scope,cmd.operationId);
    assert.equal(result.status,"succeeded");assert.equal(result.receipt?.reconciled,true);
    assert.equal(result.command.providerRequestId,cmd.providerRequestId);assert.deepEqual(reconciled,[cmd.operationId,cmd.operationId]);assert.equal(provider.writes,2);
  });
  test(`${adapter}: an expired exact dispatch lease reconciles without authorizing or repeating the write`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();
    const claimed=await store.claim(cmd);await store.transition(cmd.scope,cmd.operationId,claimed.operation.version,"dispatching",null,null);
    provider.reconcileHook=async operation=>receipt(operation.command);
    const core=new PaymentCore({store,provider,policy:{authorize:async()=>{throw new Error("Dispatch recovery cannot authorize a new write");}},now:()=>new Date(Date.now()+7200000)});
    assert.equal((await core.recoverOperation(cmd.scope,cmd.operationId)).status,"succeeded");assert.equal(provider.writes,0);assert.equal(provider.reads,1);
  });
  test(`${adapter}: an exact never-dispatched claim must still pass current authority and approval expiry`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const revoked=command();const expired=command(undefined,revoked.scope);
    await store.claim(revoked);await store.claim(expired);const untouched=await store.get(expired.scope,expired.operationId);
    const core=new PaymentCore({store,provider,policy:policy({allowed:false,reason:"The current operator role was revoked."}),now:()=>new Date(Date.now()+120000)});
    const rejected=await core.recoverOperation(revoked.scope,revoked.operationId);
    assert.equal(rejected.status,"not_sent");assert.equal(rejected.error?.kind,"AUTHORITY_DENIED");assert.deepEqual(await store.get(expired.scope,expired.operationId),untouched);
    const later=new PaymentCore({store,provider,policy:policy(),now:()=>new Date(Date.now()+7200000)});
    const result=await later.recoverOperation(expired.scope,expired.operationId);assert.equal(result.status,"not_sent");assert.equal(result.error?.kind,"APPROVAL_EXPIRED");
    assert.equal(provider.writes,0);assert.equal(provider.reads,0);
  });
  test(`${adapter}: exact recovery leaves active leases and terminal operations unchanged and enforces tenant/project scope`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const core=new PaymentCore({store,provider,policy:{authorize:async()=>{throw new Error("No write authority should be queried");}}});
    const cmd=command();const active=await store.claim(cmd);assert.deepEqual(await core.recoverOperation(cmd.scope,cmd.operationId),active.operation);
    const dispatching=await store.transition(cmd.scope,cmd.operationId,active.operation.version,"dispatching",null,null);
    assert.deepEqual(await core.recoverOperation(cmd.scope,cmd.operationId),dispatching);
    for(const status of ["succeeded","refused","not_sent"] as const){
      const terminal=command(undefined,cmd.scope);const row=await store.claim(terminal);const stored=await store.transition(terminal.scope,terminal.operationId,row.operation.version,status,null,null);
      assert.deepEqual(await core.recoverOperation(terminal.scope,terminal.operationId),stored);
    }
    await assert.rejects(core.recoverOperation({...cmd.scope,tenantId:"different-tenant"},cmd.operationId),isCode("NOT_FOUND"));
    await assert.rejects(core.recoverOperation({...cmd.scope,projectId:"different-project"},cmd.operationId),isCode("NOT_FOUND"));
    await assert.rejects(core.recoverOperation(cmd.scope,"missing-operation"),isCode("NOT_FOUND"));
    assert.equal(provider.writes,0);assert.equal(provider.reads,0);
  });
  test(`${adapter}: a lost SQL commit acknowledgement and failed attempt log preserve the canonical receipt`,async t=>{
    const {db}=await database(t,adapter);
    for(const point of ["commit","attempt"] as const){
      let injected=false;
      class FailingStore extends SqlPaymentStore {
        override async transition(scope:PaymentScope,id:string,version:number,status:OperationStatus,proof:ProviderReceipt|null,error:PaymentOperation["error"]){const value=await super.transition(scope,id,version,status,proof,error);if(point==="commit"&&status==="succeeded"&&!injected){injected=true;throw new Error("lost SQL acknowledgement");}return value;}
        override async attempt(...args:Parameters<SqlPaymentStore["attempt"]>){if(point==="attempt"&&!injected){injected=true;throw new Error("attempt audit unavailable");}return super.attempt(...args);}
      }
      const store=new FailingStore(db);const provider=new FixtureProvider();const cmd=command();const core=new PaymentCore({store,provider,policy:policy()});
      await assert.rejects(core.execute(cmd));assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"succeeded");assert.equal((await core.execute(cmd)).status,"succeeded");assert.equal(provider.writes,1);
    }
  });
  test(`${adapter}: revoked and altered authority is rejected before dispatch`,async t=>{
    const {store}=await database(t,adapter);const provider=new FixtureProvider();const cmd=command();let calls=0;
    const authority:PaymentPolicy={authorize:async request=>({...await policy().authorize(request),allowed:++calls===1})};
    const core=new PaymentCore({store,provider,policy:authority});assert.equal((await core.execute(cmd)).status,"not_sent");assert.equal(provider.writes,0);
    await assert.rejects(new PaymentCore({store,provider,policy:policy({approvalDigest:"changed"})}).execute(command()),isCode("AUTHORITY_DENIED"));assert.equal(provider.writes,0);
  });
  test(`${adapter}: signature, payload schema, canonical deduplication, and dead letters are separate decisions`,async t=>{
    const {db,store}=await database(t,adapter);const provider=new FixtureProvider();const scope=command().scope;const core=new PaymentCore({store,provider,policy:policy()});
    const raw=JSON.stringify({id:`WH-${randomUUID()}`,event_type:"PAYMENT.CAPTURE.COMPLETED",resource:{id:"CAPTURE-ELIGIBLE"}});
    const valid={verify:async()=>({verified:true,transmissionId:randomUUID()})};const invalid={verify:async()=>({verified:false,transmissionId:randomUUID()})};
    await assert.rejects(core.ingestWebhook(scope,raw,new Headers(),invalid),isCode("INVALID_SIGNATURE"));
    assert.equal((await core.ingestWebhook(scope,raw,new Headers(),valid)).duplicate,false);
    assert.equal((await core.ingestWebhook(scope,raw,new Headers(),valid)).duplicate,true);
    await assert.rejects(core.ingestWebhook(scope,'{"event_type":"INVENTED.EVENT"}',new Headers(),valid),isCode("WEBHOOK_DEAD_LETTER"));
    await assert.rejects(core.ingestWebhook(scope,raw.replace("CAPTURE-ELIGIBLE","CAPTURE-CHANGED"),new Headers(),valid),isCode("WEBHOOK_PAYLOAD_CONFLICT"));
    const events=await db.query("SELECT event_id FROM paycore_webhook_events WHERE tenant_id=$1 AND project_id=$2",[scope.tenantId,scope.projectId]);
    const deliveries=await db.query<{document:string}&Record<string,unknown>>("SELECT document FROM paycore_webhook_deliveries WHERE tenant_id=$1 AND project_id=$2",[scope.tenantId,scope.projectId]);
    assert.equal(events.rowCount,1);assert.equal(deliveries.rowCount,5);assert.equal(deliveries.rows.filter(row=>JSON.parse(row.document).status==="dead_letter").length,2);
  });
  test(`${adapter}: invoice and payout event families queue exact resource hints without financial side effects`,async t=>{
    const {db,store}=await database(t,adapter);const provider=new FixtureProvider();const scope=command().scope;const core=new PaymentCore({store,provider,policy:policy()});
    const valid={verify:async()=>({verified:true,transmissionId:randomUUID()})};
    const cases:[string,Record<string,unknown>,string][]=[];
    for(const suffix of ["CREATED","SENT","CANCELLED","PAID","REFUNDED","SCHEDULED","UPDATED"])cases.push([`INVOICING.INVOICE.${suffix}`,{id:"INV2-CONTROLLED",status:"PAYMENT_PENDING",payer_email:"private-contact@example.test"},"INV2-CONTROLLED"]);
    cases.push(["INVOICING.INVOICE.PAID",{invoice:{id:"INV2-LEGACY",status:"PARTIALLY_PAID"}},"INV2-LEGACY"]);
    for(const suffix of ["BLOCKED","CANCELED","FAILED","HELD","REFUNDED","RETURNED","SUCCEEDED","UNCLAIMED"])cases.push([`PAYMENT.PAYOUTS-ITEM.${suffix}`,{payout_item_id:"ITEM-CONTROLLED",payout_batch_id:"BATCH-PARENT",transaction_status:"PENDING"},"ITEM-CONTROLLED"]);
    for(const suffix of ["DENIED","PROCESSING","SUCCESS"])cases.push([`PAYMENT.PAYOUTSBATCH.${suffix}`,{batch_header:{payout_batch_id:"BATCH-CONTROLLED",batch_status:"SUCCESS"}},"BATCH-CONTROLLED"]);
    for(const type of ["PAYMENT.CAPTURE.DECLINED","PAYMENT.REFUND.PENDING","PAYMENT.REFUND.FAILED"])cases.push([type,{id:"PAYMENT-CONTROLLED"},"PAYMENT-CONTROLLED"]);
    for(const [type,resource,id] of cases){
      const eventId=`WH-${randomUUID()}`;const raw=JSON.stringify({id:eventId,event_type:type,resource});
      assert.equal((await core.ingestWebhook(scope,raw,new Headers(),valid)).duplicate,false);
      assert.equal((await core.ingestWebhook(scope,raw,new Headers(),valid)).duplicate,true);
      const rows=await db.query<{document:string}&Record<string,unknown>>("SELECT document FROM paycore_webhook_events WHERE tenant_id=$1 AND project_id=$2 AND event_id=$3",[scope.tenantId,scope.projectId,eventId]);
      const saved=JSON.parse(rows.rows[0]!.document);assert.equal(saved.resourceId,id);assert.equal(saved.eventType,type);assert.equal(saved.status,"queued");assert.equal(saved.source,"sample");assert.ok(!rows.rows[0]!.document.includes("private-contact"));
    }
    assert.equal(provider.writes,0);assert.equal(provider.reads,0);assert.equal((await core.listReceipts(scope)).length,0);
  });
  test(`${adapter}: malformed, conflicting and unverified commerce event identities never enter the canonical queue`,async t=>{
    const {db,store}=await database(t,adapter);const provider=new FixtureProvider();const scope=command().scope;const core=new PaymentCore({store,provider,policy:policy()});
    const valid={verify:async()=>({verified:true,transmissionId:randomUUID()})};const invalid={verify:async()=>({verified:false,transmissionId:randomUUID()})};
    const cases:[string,Record<string,unknown>][]=[
      ["INVOICING.INVOICE.PAID",{id:"INV2-ONE",invoice:{id:"INV2-OTHER"}}],
      ["INVOICING.INVOICE.PAID",{invoice:null}],
      ["PAYMENT.PAYOUTS-ITEM.SUCCEEDED",{payout_item_id:"ITEM-ONE",id:"ITEM-OTHER"}],
      ["PAYMENT.PAYOUTS-ITEM.SUCCEEDED",{payout_item_id:"../../outside"}],
      ["PAYMENT.PAYOUTS-ITEM.SUCCEEDED",{payout_batch_id:"BATCH-ONLY"}],
      ["PAYMENT.PAYOUTSBATCH.SUCCESS",{batch_header:{payout_batch_id:"BATCH-ONE"},payout_batch_id:"BATCH-OTHER"}],
      ["PAYMENT.PAYOUTS-ITEM.SUCCESS",{payout_item_id:"ITEM-WRONG-EVENT"}],
      ["PAYOUTS-ITEM.SUCCEEDED",{payout_item_id:"ITEM-MISSING-PREFIX"}],
      ["INVOICING.INVOICE.PAID",{links:[{rel:"self",href:"https://untrusted.invalid/INV2-LINK-ONLY"}]}],
    ];
    for(const [event_type,resource] of cases)await assert.rejects(core.ingestWebhook(scope,JSON.stringify({id:`WH-${randomUUID()}`,event_type,resource}),new Headers(),valid),isCode("WEBHOOK_DEAD_LETTER"));
    await assert.rejects(core.ingestWebhook(scope,JSON.stringify({id:`WH-${randomUUID()}`,event_type:"INVOICING.INVOICE.PAID",resource:{id:"INV2-UNVERIFIED"}}),new Headers(),invalid),isCode("INVALID_SIGNATURE"));
    assert.equal((await db.query("SELECT event_id FROM paycore_webhook_events WHERE tenant_id=$1 AND project_id=$2",[scope.tenantId,scope.projectId])).rowCount,0);
    assert.equal(provider.writes,0);
  });
}

test("minor-unit money never uses binary-float rounding and unsupported precision fails closed",()=>{
  assert.deepEqual(toProviderMoney({currency:"USD",minor:1201}),{currencyCode:"USD",value:"12.01"});
  assert.deepEqual(fromProviderMoney({currencyCode:"USD",value:"0.29"}),{currency:"USD",minor:29});
  assert.deepEqual(toProviderMoney({currency:"JPY",minor:1200}),{currencyCode:"JPY",value:"1200"});
  assert.throws(()=>fromProviderMoney({currencyCode:"USD",value:"0.001"}),isCode("UNREADABLE_MONEY"));
  assert.throws(()=>toProviderMoney({currency:"USD",minor:12.5}),isCode("INVALID_MONEY"));
  assert.throws(()=>fromProviderMoney({currencyCode:"USD",value:"9007199254740992"}),isCode("UNREADABLE_MONEY"));
});
test("public evidence recursively redacts credentials and customer contact data",()=>{
  const canary="synthetic-never-a-real-secret";const safe=JSON.stringify(redact({authorization:canary,nested:[{email:canary,clientSecret:canary}],captureId:"CAPTURE-123"}));
  assert.equal(safe.includes(canary),false);assert.equal(safe.includes("CAPTURE-123"),true);
});
