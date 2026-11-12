import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {sha256} from "@fracture/paypal-core";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {bindContractRows,conformanceFreshness,contractRuntimePaths,type ApplicationProof} from "../packages/analysis/src/contract-bindings";
import {SandboxPayPalProvider,PaymentCore,SqlPaymentStore,SqliteDatabase,payloadHash,ProviderError} from "../packages/paypal-core/src/index.js";
import type {PaymentAction,PaymentCommand,PaymentPolicy,ProviderAdapter,SandboxConfig} from "../packages/paypal-core/src/index.js";

async function fixture(){
 const source=await readFile("apps/fixtures/bramble/hardened.ts","utf8"),tests=await readFile("tests/application.test.ts","utf8");
 const hashes=Object.fromEntries(await Promise.all(contractRuntimePaths.map(async path=>[path,createHash("sha256").update(await readFile(path)).digest("hex")])));
 const rows=bindContractRows(source,tests,hashes,null);const names=[...new Set(rows.map(row=>row.test.label))];
 const testCases=["sqlite","postgres"].flatMap(adapter=>names.map(name=>({name:`${adapter}: ${name}`,status:"pass"})));
 const proof:ApplicationProof={source:"sample",testedAt:"2026-11-11T00:00:00Z",failed:0,passed:testCases.length,adapters:["sqlite","postgresql"],sourceHashes:hashes,testCases};
 return {source,tests,hashes,proof};
}
test("contract evidence binds exact source/test spans and only supported categories",async()=>{
 const f=await fixture();const rows=bindContractRows(f.source,f.tests,f.hashes,f.proof);assert.equal(rows.filter(row=>row.status==="verified").length,4);assert.equal(rows.find(row=>row.category==="OPTIONAL FIELDS")?.status,"bound");
 for(const row of rows){assert.ok(row.source.line>1&&row.test.line>1);assert.ok(f.tests.split("\n")[row.test.line-1]?.includes(row.test.label));assert.equal(row.source.hash,sha256(f.source));assert.equal(row.test.hash,sha256(f.tests));}
});
test("a stale provider, fixture, database or test hash invalidates all verification",async()=>{
 const f=await fixture();for(const path of contractRuntimePaths){const rows=bindContractRows(f.source,f.tests,{...f.hashes,[path]:"f".repeat(64)},f.proof);assert.ok(rows.every(row=>row.status!=="verified"));}
});
test("missing, failed, duplicate, absent-adapter and malformed receipts never verify",async()=>{
 const f=await fixture();const cases:unknown[]=[null,{}, {...f.proof,testCases:undefined},{...f.proof,failed:1},{...f.proof,adapters:[]},{...f.proof,source:"live_sandbox"},{...f.proof,testedAt:"unknown"},{...f.proof,testCases:f.proof.testCases!.map(item=>({...item,status:"fail"}))},{...f.proof,testCases:[...f.proof.testCases!,...f.proof.testCases!],passed:f.proof.passed*2}];
 for(const proof of cases){const rows=bindContractRows(f.source,f.tests,f.hashes,proof as ApplicationProof|null);assert.ok(rows.every(row=>row.status!=="verified"));}
 const oneAdapterMissing={...f.proof,testCases:f.proof.testCases!.filter(item=>item.name.startsWith("sqlite:")),passed:f.proof.passed/2};assert.ok(bindContractRows(f.source,f.tests,f.hashes,oneAdapterMissing).every(row=>row.status!=="verified"));
});
test("conformance freshness is fresh only when every runtime hash matches a valid Sample proof",async()=>{
 const f=await fixture();const fresh=conformanceFreshness(f.hashes,f.proof);assert.deepEqual({fresh:fresh.fresh,stale:fresh.stale,problems:fresh.problems},{fresh:true,stale:[],problems:[]});assert.equal(fresh.testedAt,f.proof.testedAt);assert.equal(fresh.expectedVerified,4);
 for(const path of contractRuntimePaths){const result=conformanceFreshness({...f.hashes,[path]:"f".repeat(64)},f.proof);assert.equal(result.fresh,false);assert.deepEqual(result.stale,[{path,reason:"changed"}]);}
 const target=contractRuntimePaths[3]!;const {[target]:_removed,...rest}=f.hashes;
 assert.deepEqual(conformanceFreshness(f.hashes,{...f.proof,sourceHashes:rest}).stale,[{path:target,reason:"not_in_proof"}]);
 assert.deepEqual(conformanceFreshness({...f.hashes,[target]:null},f.proof).stale,[{path:target,reason:"file_missing"}]);
 assert.deepEqual(conformanceFreshness(rest,f.proof).stale,[{path:target,reason:"file_missing"}]);
});
test("conformance freshness rejects missing, malformed, failed, non-Sample and inconsistent proofs",async()=>{
 const f=await fixture();
 for(const proof of [null,undefined,{},"proof",{...f.proof,sourceHashes:{a:"not-a-hash"}}]){const result=conformanceFreshness(f.hashes,proof);assert.equal(result.fresh,false);assert.equal(result.problems.length,1);assert.equal(result.testedAt,null);}
 for(const proof of [{...f.proof,failed:1},{...f.proof,passed:0,testCases:[]},{...f.proof,source:"live_sandbox"},{...f.proof,testedAt:"unknown"},{...f.proof,adapters:[]},{...f.proof,adapters:["sqlite","sqlite"]},{...f.proof,adapters:["mysql"]},{...f.proof,testCases:f.proof.testCases!.slice(1)},{...f.proof,testCases:undefined}]){const result=conformanceFreshness(f.hashes,proof);assert.equal(result.fresh,false);assert.deepEqual(result.stale,[]);assert.ok(result.problems.length>=1);}
});

// paypal-plan.md row bindings. Hermetic: the pinned APIMatic SDK runs against an injected fetch and a temporary SQLite store.
const sandbox:SandboxConfig={environment:"sandbox",baseUrl:"https://api-m.sandbox.paypal.com",clientId:"fixture-client-never-real",clientSecret:"fixture-secret-never-real",isolatedProject:"contract-row-bindings"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","PayPal-Debug-Id":"fixture-debug"}});
const usd12={currency:"USD",minor:1200};const amount={currency_code:"USD",value:"12.00"};
function planCommand(action:PaymentAction):PaymentCommand{const id=randomUUID();return {scope:{tenantId:id,projectId:"contract-rows"},operationId:id,businessKey:`purchase:${id}`,intentId:`intent:${id}`,providerRequestId:`request-${id}`,payloadHash:payloadHash(action),action,approval:{id:"fixture-approval",version:1,digest:"fixture-digest",expiresAt:new Date(Date.now()+3600000).toISOString()}};}
const planPolicy=(resourceIds:string[],reservationKey?:string):PaymentPolicy=>({authorize:async cmd=>({allowed:true,reason:"Fixture-only authority",resourceIds,currency:"USD",maximumMinor:1200,approvalId:cmd.approval.id,approvalVersion:cmd.approval.version,approvalDigest:cmd.approval.digest,...(reservationKey?{reservation:{resourceKey:reservationKey,currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()}}:{})})});
async function planStore(t:{after(fn:()=>Promise<void>):void}){const dir=await mkdtemp(join(tmpdir(),"fracture-plan-rows-"));const db=new SqliteDatabase(join(dir,"rows.sqlite"));const store=new SqlPaymentStore(db);await store.initialize();t.after(async()=>{await db.close();await rm(dir,{recursive:true,force:true});});return store;}
function wire(handler:(request:Request,path:string)=>Response|Promise<Response>){const seen:string[]=[];const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);assert.equal(new URL(input.url).origin,sandbox.baseUrl);const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token")return json({access_token:"fixture-token-never-real",token_type:"Bearer",expires_in:3600});seen.push(`${input.method} ${path}`);return handler(input,path);};return {transport,seen};}
const lost=()=>{throw new TypeError("fixture connection reset");};
const createOrder=()=>planCommand({kind:"create_order",money:usd12,intent:"CAPTURE",customId:"fixture-purchase"});
for(const [status,answer] of [[401,502],[403,502],[429,503]] as const)test(`plan row: provider ${status} on a write is one refused attempt answered as ${answer}`,async t=>{
 const store=await planStore(t);const {transport,seen}=wire(()=>json({name:"FIXTURE",message:"synthetic-private-text"},status));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy([])}).execute(createOrder());
 assert.equal(result.status,"refused");assert.equal(result.error?.httpStatus,answer);assert.deepEqual(seen,["POST /v2/checkout/orders"]);assert.equal(JSON.stringify(result).includes("synthetic-private"),false);
});
for(const status of [500,503] as const)test(`plan row: provider ${status} on a write is an unknown outcome, never a refusal or a resend`,async t=>{
 const store=await planStore(t);const {transport,seen}=wire(()=>json({name:"INTERNAL_SERVICE_ERROR"},status));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy([])}).execute(createOrder());
 assert.equal(result.status,"pending_reconciliation");assert.equal(result.error?.httpStatus,502);assert.deepEqual(seen,["POST /v2/checkout/orders"]);
});
test("plan row: an unreadable declared 4xx body is still a refusal with the provider status",async t=>{
 const store=await planStore(t);const {transport,seen}=wire(()=>new Response("{",{status:422,headers:{"Content-Type":"application/json"}}));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy([])}).execute(createOrder());
 assert.equal(result.status,"refused");assert.equal(result.error?.httpStatus,422);assert.deepEqual(seen,["POST /v2/checkout/orders"]);
});
test("plan row: a lost create-order response stays pending with no invented lookup",async t=>{
 const store=await planStore(t);const {transport,seen}=wire(lost);const cmd=createOrder();
 const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy([])});
 assert.equal((await core.execute(cmd)).status,"pending_reconciliation");assert.equal((await core.reconcile(cmd.scope,cmd.operationId)).status,"pending_reconciliation");assert.equal((await core.execute(cmd)).status,"pending_reconciliation");
 assert.deepEqual(seen,["POST /v2/checkout/orders"]);
});
test("plan row: a lost authorize-order response reconciles through the original order and its authorization",async t=>{
 const store=await planStore(t);let authorized=false;const authorization={id:"AUTHORIZATION-OBSERVED",status:"CREATED",amount};
 const {transport,seen}=wire((request,path)=>{if(request.method==="POST"){authorized=true;return lost();}if(path==="/v2/payments/authorizations/AUTHORIZATION-OBSERVED")return json(authorization);return json({id:"ORDER-APPROVED",status:authorized?"COMPLETED":"APPROVED",purchase_units:[{amount,...(authorized?{payments:{authorizations:[authorization]}}:{})}]});});
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy(["ORDER-APPROVED"])}).execute(planCommand({kind:"authorize_order",orderId:"ORDER-APPROVED",money:usd12}));
 assert.equal(result.status,"succeeded");assert.equal(result.receipt?.reconciled,true);
 assert.deepEqual(seen,["GET /v2/checkout/orders/ORDER-APPROVED","POST /v2/checkout/orders/ORDER-APPROVED/authorize","GET /v2/checkout/orders/ORDER-APPROVED","GET /v2/payments/authorizations/AUTHORIZATION-OBSERVED"]);
});
test("plan row: a lost capture-authorization response reads the authorization and attributes no capture",async t=>{
 const store=await planStore(t);const {transport,seen}=wire(request=>request.method==="POST"?lost():json({id:"AUTHORIZATION-OBSERVED",status:"PARTIALLY_CAPTURED",amount}));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy(["AUTHORIZATION-OBSERVED"],"authorization:AUTHORIZATION-OBSERVED")}).execute(planCommand({kind:"capture_authorization",authorizationId:"AUTHORIZATION-OBSERVED",money:usd12}));
 assert.equal(result.status,"pending_reconciliation");assert.equal(result.receipt,null);
 assert.deepEqual(seen,["POST /v2/payments/authorizations/AUTHORIZATION-OBSERVED/capture","GET /v2/payments/authorizations/AUTHORIZATION-OBSERVED"]);
});
for(const [observed,expected] of [["VOIDED","succeeded"],["CREATED","pending_reconciliation"]] as const)test(`plan row: a lost void response is ${expected} when the authorization reads ${observed}`,async t=>{
 const store=await planStore(t);const {transport,seen}=wire(request=>request.method==="POST"?lost():json({id:"AUTHORIZATION-OBSERVED",status:observed,amount}));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy(["AUTHORIZATION-OBSERVED"])}).execute(planCommand({kind:"void_authorization",authorizationId:"AUTHORIZATION-OBSERVED",money:usd12}));
 assert.equal(result.status,expected);assert.deepEqual(seen,["POST /v2/payments/authorizations/AUTHORIZATION-OBSERVED/void","GET /v2/payments/authorizations/AUTHORIZATION-OBSERVED"]);
});
test("plan row: no response on a read is an unconfirmed state, not a payment failure",async()=>{
 const {transport,seen}=wire(lost);
 await assert.rejects(()=>new SandboxPayPalProvider(sandbox,transport).read("order","ORDER-APPROVED"),error=>error instanceof ProviderError&&error.kind==="connection"&&error.outcome==="unknown"&&error.httpStatus===502);
 assert.deepEqual(seen,["GET /v2/checkout/orders/ORDER-APPROVED"]);
});
test("plan row: capture is refused before any write when the order read is not APPROVED",async t=>{
 const store=await planStore(t);const {transport,seen}=wire(()=>json({id:"ORDER-APPROVED",status:"CREATED",purchase_units:[{amount}]}));
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy(["ORDER-APPROVED"])}).execute(planCommand({kind:"capture_order",orderId:"ORDER-APPROVED",money:usd12}));
 assert.equal(result.status,"refused");assert.equal(result.error?.httpStatus,409);assert.deepEqual(seen,["GET /v2/checkout/orders/ORDER-APPROVED"]);
});
test("plan row: a non-provider throwable after dispatch is rethrown and the operation is kept for reconciliation",async t=>{
 const store=await planStore(t);const cmd=createOrder();
 const provider:ProviderAdapter={source:"sample",execute:async()=>{throw new RangeError("fixture application bug");},reconcile:async()=>null,read:async()=>[]};
 await assert.rejects(()=>new PaymentCore({store,provider,policy:planPolicy([])}).execute(cmd),error=>error instanceof RangeError);
 assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"pending_reconciliation");
});
test("plan row: an SDK encode failure is never sent, with no OAuth request, write or reread",async t=>{
 const store=await planStore(t);let requests=0;const transport:typeof fetch=async()=>{requests++;throw new Error("An encode failure must not reach the network.");};
 const action:PaymentAction={kind:"create_order",money:usd12,intent:"CAPTURE",customId:42 as unknown as string};
 const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:planPolicy([])}).execute(planCommand(action));
 assert.equal(result.status,"not_sent");assert.equal(result.error?.kind,"encode");assert.equal(result.error?.httpStatus,400);assert.equal(requests,0);
});
test("row copy names the run date, the adapters and Sample provenance, and never reads as pending work",async()=>{
 const f=await fixture();const fresh=bindContractRows(f.source,f.tests,f.hashes,f.proof),stale=bindContractRows(f.source,f.tests,{...f.hashes,[contractRuntimePaths[5]!]:"f".repeat(64)},f.proof);
 for(const row of fresh.filter(row=>row.status==="verified")){assert.match(row.testResult,/^Passed on 2 database adapters \(postgresql, sqlite\) in the conformance run of 2026-11-11/);assert.match(row.testResult,/Sample evidence from the local provider model; not a live PayPal result\.$/);assert.equal(row.verifiedAt,f.proof.testedAt);}
 for(const row of [...fresh,...stale]){assert.doesNotMatch(row.testResult,/pending|receipt|awaiting|not yet|TBD/i);if(row.status!=="verified")assert.equal(row.verifiedAt,null);}
 assert.match(fresh.find(row=>row.category==="OPTIONAL FIELDS")!.testResult,/^Linked by design/);assert.ok(stale.every(row=>row.status==="bound"));
});
