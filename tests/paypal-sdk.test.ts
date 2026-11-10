import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SandboxPayPalProvider, PayPalWebhookVerifier, PaymentCore, SqlPaymentStore, SqliteDatabase, payloadHash, PaymentError } from "../packages/paypal-core/src/index.js";
import type { PaymentCommand, PaymentPolicy, SandboxConfig, CheckoutExperience, SavedWallet, SaveWalletOnSuccess, AuthorizationDecision } from "../packages/paypal-core/src/index.js";
const sandbox:SandboxConfig={environment:"sandbox",baseUrl:"https://api-m.sandbox.paypal.com",clientId:"fixture-client-never-real",clientSecret:"fixture-secret-never-real",isolatedProject:"hardened-control-conformance"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","PayPal-Debug-Id":"fixture-debug"}});
const token=()=>json({access_token:"fixture-token-never-real",token_type:"Bearer",expires_in:3600});
const capture=()=>({id:"CAPTURE-OBSERVED",status:"COMPLETED",amount:{currency_code:"USD",value:"12.00"}});
const order=(captured=false)=>({id:"ORDER-APPROVED",status:captured?"COMPLETED":"APPROVED",purchase_units:[{amount:{currency_code:"USD",value:"12.00"},...(captured?{payments:{captures:[capture()]}}:{})}]});
function command(kind:"capture_order"|"create_order"="capture_order"):PaymentCommand{
  const action=kind==="capture_order"?{kind,orderId:"ORDER-APPROVED",money:{currency:"USD",minor:1200}}:{kind,money:{currency:"USD",minor:1200},intent:"CAPTURE" as const,customId:"fixture-purchase"};
  const id=randomUUID();return {scope:{tenantId:id,projectId:"hardened-control"},operationId:id,businessKey:`purchase:${id}`,intentId:`intent:${id}`,providerRequestId:`capture-${id}`,payloadHash:payloadHash(action),action,approval:{id:"fixture-approval",version:1,digest:"fixture-digest",expiresAt:new Date(Date.now()+3600000).toISOString()}};
}
const policy:PaymentPolicy={authorize:async cmd=>({allowed:true,reason:"Fixture-only authority",resourceIds:["ORDER-APPROVED"],currency:"USD",maximumMinor:1200,approvalId:cmd.approval.id,approvalVersion:cmd.approval.version,approvalDigest:cmd.approval.digest})};
async function setup(){const dir=await mkdtemp(join(tmpdir(),"fracture-sdk-"));const db=new SqliteDatabase(join(dir,"control.sqlite"));const store=new SqlPaymentStore(db);await store.initialize();return {store,close:async()=>{await db.close();await rm(dir,{recursive:true,force:true});}};}

test("pinned SDK uses sandbox host, public operation fields, stable provider identity, and committed claim",async t=>{
  const {store,close}=await setup();t.after(close);const cmd=command("create_order");
  const seen:{path:string;body:unknown;requestId:string|null;genericId:string|null}[]=[];
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);assert.equal(new URL(input.url).origin,sandbox.baseUrl);assert.ok(input.signal);
    const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token"){assert.match(input.headers.get("authorization")??"",/^Basic /);return token();}
    assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"dispatching");
    seen.push({path,body:JSON.parse(await input.clone().text()),requestId:input.headers.get("paypal-request-id"),genericId:input.headers.get("idempotency-key")});return json({id:"ORDER-CREATED",status:"CREATED"},201);
  };
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy});const result=await core.execute(cmd);
  assert.equal(result.status,"succeeded");assert.equal(seen.length,1);assert.equal(seen[0]?.path,"/v2/checkout/orders");assert.equal(seen[0]?.requestId,cmd.providerRequestId);assert.ok(seen[0]?.genericId);
  assert.deepEqual(seen[0]?.body,{intent:"CAPTURE",purchase_units:[{amount:{currency_code:"USD",value:"12.00"},custom_id:"fixture-purchase"}]});
  assert.equal(result.receipt?.resources[0]?.kind,"order");assert.equal(result.receipt?.resources.some(resource=>resource.kind==="capture"),false);
});
const experience:CheckoutExperience={returnUrl:"https://merchant.example/approved?state=fixture",cancelUrl:"https://merchant.example/cancelled",userAction:"PAY_NOW",shippingPreference:"NO_SHIPPING",brandName:"Fixture merchant",locale:"en-US"};
const savedWallet:SavedWallet={vaultId:"VAULT-fixture",consentId:"consent-fixture",consentVersion:2,consentDigest:"fixture-consent-digest",paymentInitiator:"MERCHANT",usagePattern:"UNSCHEDULED_PREPAID",usage:"DERIVED"};
function checkoutCommand(options:{experience?:CheckoutExperience;savedWallet?:SavedWallet;saveWalletOnSuccess?:SaveWalletOnSuccess}):PaymentCommand{
  const base=command("create_order");assert.equal(base.action.kind,"create_order");
  const action={...base.action,...options};return {...base,action,payloadHash:payloadHash(action)};
}
async function checkoutDecision(cmd:PaymentCommand):Promise<AuthorizationDecision>{return {...await policy.authorize(cmd),resourceIds:["VAULT-fixture"],checkoutOrigins:["https://merchant.example","http://localhost:4102"],savedWalletConsent:{...savedWallet,expiresAt:new Date(Date.now()+3600000).toISOString()}};}
for(const mode of ["redirect","wallet","combined"] as const)test(`pinned SDK ${mode} checkout sends only approved source fields and preserves separate order state`,async t=>{
  const {store,close}=await setup();t.after(close);let writes=0;
  const cmd=checkoutCommand({...(mode!=="wallet"?{experience}:{}),...(mode!=="redirect"?{savedWallet}:{})});
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);if(new URL(input.url).pathname==="/v1/oauth2/token")return token();
    assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"dispatching");assert.equal(input.headers.get("paypal-request-id"),cmd.providerRequestId);writes++;
    assert.deepEqual(JSON.parse(await input.text()),{intent:"CAPTURE",purchase_units:[{amount:{currency_code:"USD",value:"12.00"},custom_id:"fixture-purchase"}],payment_source:{paypal:{
      ...(mode!=="wallet"?{experience_context:{return_url:experience.returnUrl,cancel_url:experience.cancelUrl,user_action:"PAY_NOW",shipping_preference:"NO_SHIPPING",brand_name:"Fixture merchant",locale:"en-US",contact_preference:"NO_CONTACT_INFO",landing_page:"NO_PREFERENCE",payment_method_preference:"UNRESTRICTED"}}:{}),
      ...(mode!=="redirect"?{vault_id:"VAULT-fixture",stored_credential:{payment_initiator:"MERCHANT",usage_pattern:"UNSCHEDULED_PREPAID",usage:"DERIVED"}}:{}),
    }}});
    return json({id:"ORDER-NEEDS-ACTION",status:"PAYER_ACTION_REQUIRED",links:[{rel:"payer-action",href:"https://www.sandbox.paypal.com/checkoutnow?token=ORDER-NEEDS-ACTION",method:"GET"}]},201);
  };
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:{authorize:checkoutDecision}});
  const result=await core.execute(cmd);assert.equal(result.status,"succeeded");assert.equal(writes,1);assert.equal(result.receipt?.resources.length,1);assert.equal(result.receipt?.resources[0]?.kind,"order");assert.equal(result.receipt?.resources[0]?.status,"PAYER_ACTION_REQUIRED");assert.equal(result.receipt?.resources[0]?.links[0]?.rel,"payer-action");
});
for(const [label,url,code] of [
  ["ungranted origin","https://outside.example/return","CHECKOUT_ORIGIN_NOT_GRANTED"],
  ["remote plaintext","http://merchant.example/return","INVALID_CHECKOUT_URL"],
  ["embedded password","https://user:secret@merchant.example/return","INVALID_CHECKOUT_URL"],
  ["fragment","https://merchant.example/return#private","INVALID_CHECKOUT_URL"],
] as const)test(`checkout rejects ${label} before authentication or claim`,async t=>{
  const {store,close}=await setup();t.after(close);let calls=0;const cmd=checkoutCommand({experience:{...experience,returnUrl:url}});
  const transport:typeof fetch=async()=>{calls++;throw new Error("No provider traffic permitted");};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:{authorize:checkoutDecision}});
  await assert.rejects(()=>core.execute(cmd),error=>error instanceof PaymentError&&error.code===code);assert.equal(calls,0);assert.equal(await store.get(cmd.scope,cmd.operationId),null);
});
for(const change of ["missing","expired","version","digest","vault","pattern","initiator","usage","resource"] as const)test(`saved wallet refuses ${change} current consent before provider traffic`,async t=>{
  const {store,close}=await setup();t.after(close);let calls=0;const cmd=checkoutCommand({savedWallet});
  const currentPolicy:PaymentPolicy={authorize:async request=>{
    const decision=await checkoutDecision(request);const consent=decision.savedWalletConsent!;
    if(change==="missing")delete decision.savedWalletConsent;
    if(change==="expired")consent.expiresAt="2020-01-01T00:00:00Z";
    if(change==="version")consent.consentVersion++;
    if(change==="digest")consent.consentDigest="other-digest";
    if(change==="vault")consent.vaultId="VAULT-other";
    if(change==="pattern")consent.usagePattern="DEFERRED";
    if(change==="initiator")consent.paymentInitiator="CUSTOMER";
    if(change==="usage")consent.usage="SUBSEQUENT";
    if(change==="resource")decision.resourceIds=[];
    return decision;
  }};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw new Error("No provider traffic permitted");}),policy:currentPolicy});
  await assert.rejects(()=>core.execute(cmd),error=>error instanceof PaymentError&&error.code===(change==="resource"?"RESOURCE_NOT_GRANTED":"WALLET_CONSENT_NOT_GRANTED"));assert.equal(calls,0);
});
test("wallet consent revoked after durable claim cannot dispatch",async t=>{
  const {store,close}=await setup();t.after(close);let checks=0;let calls=0;const cmd=checkoutCommand({savedWallet});
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw new Error("No provider traffic permitted");}),policy:{authorize:async request=>{const decision=await checkoutDecision(request);if(++checks>1)delete decision.savedWalletConsent;return decision;}}});
  const result=await core.execute(cmd);assert.equal(result.status,"not_sent");assert.equal(result.error?.kind,"WALLET_CONSENT_NOT_GRANTED");assert.equal(calls,0);assert.equal(checks,2);
});
test("nested checkout changes cannot reuse a durable operation identity",async t=>{
  const {store,close}=await setup();t.after(close);let writes=0;const cmd=checkoutCommand({experience});
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);if(new URL(input.url).pathname==="/v1/oauth2/token")return token();writes++;return json({id:"ORDER-CREATED",status:"CREATED"},201);};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:{authorize:checkoutDecision}});await core.execute(cmd);
  const action={...cmd.action,experience:{...experience,cancelUrl:"https://merchant.example/changed"}};const changed={...cmd,action,payloadHash:payloadHash(action)};
  await assert.rejects(()=>core.execute(changed),error=>error instanceof PaymentError&&error.code==="PAYLOAD_CONFLICT");assert.equal(writes,1);
});
const saveWalletOnSuccess:SaveWalletOnSuccess={consentId:"save-consent-fixture",consentVersion:1,consentDigest:"save-consent-digest",usageType:"MERCHANT"};
async function saveDecision(cmd:PaymentCommand):Promise<AuthorizationDecision>{return {...await checkoutDecision(cmd),saveWalletConsent:{...saveWalletOnSuccess,expiresAt:new Date(Date.now()+3600000).toISOString()}};}
test("pinned SDK first-purchase wallet saving emits the exact vault instruction without consent or token leakage",async t=>{
  const {store,close}=await setup();t.after(close);let writes=0;
  const cmd=checkoutCommand({experience,saveWalletOnSuccess});
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);if(new URL(input.url).pathname==="/v1/oauth2/token")return token();
    writes++;assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"dispatching");
    assert.equal(input.headers.get("paypal-request-id"),cmd.providerRequestId);
    const body=JSON.parse(await input.text());
    assert.deepEqual(body.payment_source.paypal.attributes,{vault:{store_in_vault:"ON_SUCCESS",usage_type:"MERCHANT",customer_type:"CONSUMER",permit_multiple_payment_tokens:false}});
    assert.equal(body.payment_source.paypal.experience_context.return_url,experience.returnUrl);
    assert.equal(body.purchase_units[0].amount.value,"12.00");
    assert.equal(JSON.stringify(body).includes(saveWalletOnSuccess.consentId),false);
    assert.equal(JSON.stringify(body).includes(saveWalletOnSuccess.consentDigest),false);
    return json({...order(true),payment_source:{paypal:{attributes:{vault:{id:"PRIVATE-VAULT-FIXTURE",status:"VAULTED",customer:{id:"PRIVATE-CUSTOMER-FIXTURE"}}}}}},201);
  };
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:{authorize:saveDecision}});
  const result=await core.execute(cmd);assert.equal(result.status,"succeeded");assert.equal(writes,1);
  assert.equal(JSON.stringify(result.receipt).includes("PRIVATE-"),false);
  assert.equal(result.receipt?.resources.filter(r=>r.kind==="capture").length,1);
  await core.execute(cmd);assert.equal(writes,1);
  const changed=checkoutCommand({experience,saveWalletOnSuccess:{...saveWalletOnSuccess,consentVersion:2}});
  const changedCore=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:{authorize:async request=>({...await saveDecision(request),saveWalletConsent:{...saveWalletOnSuccess,consentVersion:2,expiresAt:new Date(Date.now()+3600000).toISOString()}})}});
  await assert.rejects(()=>changedCore.execute({...cmd,action:changed.action,payloadHash:changed.payloadHash}),error=>error instanceof PaymentError&&error.code==="PAYLOAD_CONFLICT");assert.equal(writes,1);
});
for(const change of ["missing","expired","invalid expiry","id","version","digest","usage type","amount"] as const)test(`first-purchase wallet save refuses ${change} authority without traffic`,async t=>{
  const {store,close}=await setup();t.after(close);let calls=0;const cmd=checkoutCommand({experience,saveWalletOnSuccess});
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw new Error("No provider traffic permitted");}),policy:{authorize:async request=>{
    const decision=await saveDecision(request);const consent=decision.saveWalletConsent!;
    if(change==="missing")delete decision.saveWalletConsent;
    if(change==="expired")consent.expiresAt="2020-01-01T00:00:00Z";
    if(change==="invalid expiry")consent.expiresAt="invalid";
    if(change==="id")consent.consentId="other-consent";
    if(change==="version")consent.consentVersion++;
    if(change==="digest")consent.consentDigest="other-digest";
    if(change==="usage type")Object.assign(consent,{usageType:"PLATFORM"});
    if(change==="amount")decision.maximumMinor=1199;
    return decision;
  }}});
  await assert.rejects(()=>core.execute(cmd),error=>error instanceof PaymentError&&error.code===(change==="amount"?"AMOUNT_NOT_APPROVED":"SAVE_WALLET_CONSENT_NOT_GRANTED"));
  assert.equal(calls,0);assert.equal(await store.get(cmd.scope,cmd.operationId),null);
});
for(const [change,expected] of [["redirect","SAVE_WALLET_REDIRECT_REQUIRED"],["both sources","CONFLICTING_WALLET_SOURCES"],["blank id","INVALID_SAVE_WALLET_CONSENT"],["bad version","INVALID_SAVE_WALLET_CONSENT"],["platform","INVALID_SAVE_WALLET_CONSENT"]] as const)test(`first-purchase wallet save rejects ${change}`,async t=>{
  const {store,close}=await setup();t.after(close);let calls=0;
  const save={...saveWalletOnSuccess};if(change==="blank id")save.consentId=" ";if(change==="bad version")save.consentVersion=1.5;if(change==="platform")Object.assign(save,{usageType:"PLATFORM"});
  const cmd=checkoutCommand({...(change!=="redirect"?{experience}:{}),saveWalletOnSuccess:save,...(change==="both sources"?{savedWallet}:{})});
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw new Error("No provider traffic permitted");}),policy:{authorize:saveDecision}});
  await assert.rejects(()=>core.execute(cmd),error=>error instanceof PaymentError&&error.code===expected);assert.equal(calls,0);assert.equal(await store.get(cmd.scope,cmd.operationId),null);
});
test("new wallet saving consent revoked after claim leaves a never-sent operation",async t=>{
  const {store,close}=await setup();t.after(close);let checks=0;let calls=0;
  const cmd=checkoutCommand({experience,saveWalletOnSuccess});
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw new Error("No provider traffic permitted");}),policy:{authorize:async request=>{const decision=await saveDecision(request);if(++checks>1)delete decision.saveWalletConsent;return decision;}}});
  const result=await core.execute(cmd);assert.equal(result.status,"not_sent");assert.equal(result.error?.kind,"SAVE_WALLET_CONSENT_NOT_GRANTED");assert.equal(calls,0);assert.equal(checks,2);
});
for(const kind of ["authorize_order","capture_order"] as const)test(`pinned SDK ${kind} sends empty JSON after payer approval`,async t=>{
  const {store,close}=await setup();t.after(close);const base=command();const action={kind,orderId:"ORDER-APPROVED",money:{currency:"USD",minor:1200}};const cmd={...base,action,payloadHash:payloadHash(action)};
  let writes=0;
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token")return token();
    if(input.method==="GET")return json(order());
    writes++;assert.equal(input.headers.get("content-type"),"application/json");assert.equal(await input.text(),"{}");assert.equal(input.headers.get("paypal-request-id"),cmd.providerRequestId);
    assert.equal(path,`/v2/checkout/orders/ORDER-APPROVED/${kind==="authorize_order"?"authorize":"capture"}`);
    return json({id:"ORDER-APPROVED",status:"COMPLETED",purchase_units:[{payments:kind==="authorize_order"?{authorizations:[{id:"AUTHORIZATION-OBSERVED",status:"CREATED",amount:{currency_code:"USD",value:"12.00"}}]}:{captures:[capture()]}}]},201);
  };
  const result=await new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy}).execute(cmd);assert.equal(result.status,"succeeded");assert.equal(writes,1);
});
for(const failure of ["connection","malformed-success"] as const){
  test(`pinned SDK ${failure} after capture reconciles original order and capture reads`,async t=>{
    const {store,close}=await setup();t.after(close);const cmd=command();let captured=false;let writes=0;const reads:string[]=[];
    const transport:typeof fetch=async input=>{
      assert.ok(input instanceof Request);const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token")return token();
      if(input.method==="POST"){
        assert.equal((await store.get(cmd.scope,cmd.operationId))?.status,"dispatching");assert.equal(input.headers.get("paypal-request-id"),cmd.providerRequestId);assert.equal(input.headers.get("prefer"),"return=representation");
        writes++;captured=true;if(failure==="connection")throw new TypeError("fixture reset after effect");return new Response("{",{status:201,headers:{"Content-Type":"application/json"}});
      }
      reads.push(path);if(path==="/v2/checkout/orders/ORDER-APPROVED")return json(order(captured));if(path==="/v2/payments/captures/CAPTURE-OBSERVED")return json(capture());throw new Error("Unexpected fixture request");
    };
    const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy});const result=await core.execute(cmd);
    assert.equal(result.status,"succeeded");assert.equal(result.receipt?.reconciled,true);assert.equal(writes,1);assert.deepEqual(reads,["/v2/checkout/orders/ORDER-APPROVED","/v2/checkout/orders/ORDER-APPROVED","/v2/payments/captures/CAPTURE-OBSERVED"]);
  });
}

test("pinned SDK OAuth refusal is never sent and does not issue payment reads or writes",async t=>{
  const {store,close}=await setup();t.after(close);const paths:string[]=[];
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);paths.push(new URL(input.url).pathname);return json({error:"invalid_client",error_description:"fixture refusal"},401);};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy});assert.equal((await core.execute(command("create_order"))).status,"not_sent");assert.deepEqual(paths,["/v1/oauth2/token"]);
});
test("pinned SDK 422 is a refusal with no automatic POST retry or unsafe body exposure",async t=>{
  const {store,close}=await setup();t.after(close);let writes=0;
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);if(new URL(input.url).pathname==="/v1/oauth2/token")return token();writes++;return json({name:"UNPROCESSABLE_ENTITY",message:"synthetic-private-payer@example.invalid",debug_id:"fixture-debug",details:[{issue:"INSTRUMENT_DECLINED",description:"fixture reason"}]},422);};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy});const result=await core.execute(command("create_order"));assert.equal(result.status,"refused");assert.equal(writes,1);assert.equal(JSON.stringify(result).includes("example.invalid"),false);assert.match(result.error?.message??"",/INSTRUMENT_DECLINED/);assert.match(result.error?.message??"",/another payment method/);assert.equal(result.error?.httpStatus,422);
});
test("provider refusal does not echo unknown reasons, customer values, or descriptions",async t=>{
  const {store,close}=await setup();t.after(close);
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);if(new URL(input.url).pathname==="/v1/oauth2/token")return token();return json({name:"synthetic-private-name",message:"synthetic-private-payer@example.invalid",debug_id:"fixture-debug",details:[{issue:"synthetic-private-issue",description:"synthetic-private-description",value:"synthetic-private-value"}]},422);};
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy});const result=await core.execute(command("create_order"));assert.equal(result.status,"refused");assert.equal(result.error?.httpStatus,422);assert.equal(JSON.stringify(result).includes("synthetic-private"),false);
});
test("Transaction Search accepts an omitted array only with explicit empty totals",async()=>{
  let reads=0;const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);const url=new URL(input.url);if(url.pathname==="/v1/oauth2/token")return token();reads++;assert.equal(url.pathname,"/v1/reporting/transactions");assert.equal(url.searchParams.get("page"),"1");return json({page:1,total_items:0,total_pages:0});};
  const result=await new SandboxPayPalProvider(sandbox,transport).searchTransactions("2026-11-01T00:00:00Z","2026-11-02T00:00:00Z",new Set());assert.deepEqual(result,{items:[],complete:true,pages:1,source:"live_sandbox"});assert.equal(reads,1);
});
for(const [label,response] of Object.entries({
  "missing totals":{},
  "omitted nonempty page":{page:1,total_items:3,total_pages:1},
  "contradictory empty totals":{page:1,total_items:0,total_pages:0,transaction_details:[{}]},
  "wrong response page":{page:2,total_items:0,total_pages:0,transaction_details:[]},
}))test(`Transaction Search rejects ${label} instead of asserting complete history`,async()=>{
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);return new URL(input.url).pathname==="/v1/oauth2/token"?token():json(response);};
  await assert.rejects(()=>new SandboxPayPalProvider(sandbox,transport).searchTransactions("2026-11-01T00:00:00Z","2026-11-02T00:00:00Z",new Set()),error=>error instanceof Error&&error.message.includes("pagination evidence"));
});
test("sandbox adapter rejects production hosts and omitted isolation before authentication",()=>{
  assert.throws(()=>new SandboxPayPalProvider({...sandbox,baseUrl:"https://api-m.paypal.com"}),error=>error instanceof PaymentError&&error.code==="SANDBOX_REQUIRED");
  assert.throws(()=>new SandboxPayPalProvider({...sandbox,isolatedProject:""}),error=>error instanceof PaymentError&&error.code==="ISOLATION_REQUIRED");
});
test("pinned SDK partial refund sends exact cents and custom identity while pending money stays reserved",async t=>{
  const {store,close}=await setup();t.after(close);const base=command();const action={kind:"refund_capture" as const,captureId:"CAPTURE-OBSERVED",money:{currency:"USD",minor:400}};
  const cmd={...base,action,payloadHash:payloadHash(action)};let writes=0;
  const refundPolicy:PaymentPolicy={authorize:async request=>({...await policy.authorize(request),resourceIds:["CAPTURE-OBSERVED"],reservation:{resourceKey:"capture:CAPTURE-OBSERVED",currency:"USD",totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()}})};
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token")return token();
    if(input.method==="GET")return json(capture());
    writes++;assert.equal(path,"/v2/payments/captures/CAPTURE-OBSERVED/refund");assert.equal(input.headers.get("paypal-request-id"),cmd.providerRequestId);
    assert.deepEqual(JSON.parse(await input.text()),{amount:{currency_code:"USD",value:"4.00"},custom_id:cmd.operationId});
    return json({id:"REFUND-PENDING",status:"PENDING",amount:{currency_code:"USD",value:"4.00"},custom_id:cmd.operationId},201);
  };
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:refundPolicy});const result=await core.execute(cmd);assert.equal(result.status,"pending_reconciliation");assert.equal(result.receipt?.resources[0]?.status,"PENDING");assert.equal(writes,1);
});
test("REST webhook verification preserves signed JSON and rejects attacker certificate hosts",async()=>{
  const raw='{ "id":"WH-fixture", "event_type":"PAYMENT.CAPTURE.COMPLETED", "resource":{"id":"CAPTURE-OBSERVED","amount":{"value":12.00}} }';
  let postback="";let calls=0;
  const transport:typeof fetch=async input=>{assert.ok(input instanceof Request);calls++;const path=new URL(input.url).pathname;if(path==="/v1/oauth2/token")return token();assert.equal(path,"/v1/notifications/verify-webhook-signature");postback=await input.text();return json({verification_status:"SUCCESS"});};
  const verifier=new PayPalWebhookVerifier(sandbox,"WH-registered-fixture",transport);
  const headers=new Headers({"paypal-transmission-id":"transmission-fixture","paypal-transmission-time":new Date().toISOString(),"paypal-cert-url":"https://api.sandbox.paypal.com/v1/notifications/certs/fixture","paypal-auth-algo":"SHA256withRSA","paypal-transmission-sig":"fixture-signature"});
  assert.equal((await verifier.verify(raw,headers)).verified,true);assert.ok(postback.includes(`"webhook_event":${raw}`));
  headers.set("paypal-cert-url","https://attacker.invalid/cert");assert.equal((await verifier.verify(raw,headers)).verified,false);assert.equal(calls,2);
});

const ticketItems=[{name:'Admission',unitAmount:{currency:'USD',minor:3500},quantity:1,sku:'admission'},{name:'Soundcheck perk',unitAmount:{currency:'USD',minor:1500},quantity:1,sku:'soundcheck'}];
function itemizedCommand(items:typeof ticketItems):PaymentCommand {
  const base=command('create_order');
  const action={kind:'create_order' as const,money:{currency:'USD',minor:5000},intent:'CAPTURE' as const,customId:'fixture-ticket',items};
  return {...base,action,payloadHash:payloadHash(action)};
}
const ticketPolicy:PaymentPolicy={authorize:async cmd=>({...await policy.authorize(cmd),maximumMinor:5000})};
test('itemized ticket sends exact two components and matching item_total through the pinned SDK',async t=>{
  const {store,close}=await setup();t.after(close);const cmd=itemizedCommand(ticketItems);let writes=0;
  const transport:typeof fetch=async input=>{
    assert.ok(input instanceof Request);if(new URL(input.url).pathname==='/v1/oauth2/token')return token();
    writes++;assert.equal(input.headers.get('paypal-request-id'),cmd.providerRequestId);
    assert.deepEqual(JSON.parse(await input.text()),{intent:'CAPTURE',purchase_units:[{custom_id:'fixture-ticket',amount:{currency_code:'USD',value:'50.00',breakdown:{item_total:{currency_code:'USD',value:'50.00'}}},items:[{name:'Admission',unit_amount:{currency_code:'USD',value:'35.00'},quantity:'1',sku:'admission'},{name:'Soundcheck perk',unit_amount:{currency_code:'USD',value:'15.00'},quantity:'1',sku:'soundcheck'}]}]});
    return json({id:'ITEMIZED-ORDER',status:'CREATED'},201);
  };
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,transport),policy:ticketPolicy});
  assert.equal((await core.execute(cmd)).status,'succeeded');assert.equal(writes,1);
  const changed=itemizedCommand([{...ticketItems[0]!,name:'Changed component'},ticketItems[1]!]);
  await assert.rejects(()=>core.execute({...cmd,action:changed.action,payloadHash:changed.payloadHash}),e=>e instanceof PaymentError&&e.code==='PAYLOAD_CONFLICT');assert.equal(writes,1);
});
for(const [label,items,code] of [
  ['sum differs',[{...ticketItems[0]!,quantity:2},ticketItems[1]!],'ITEM_TOTAL_MISMATCH'],
  ['foreign currency',[{...ticketItems[0]!,unitAmount:{currency:'EUR',minor:3500}},ticketItems[1]!],'ITEM_CURRENCY_MISMATCH'],
  ['fractional quantity',[{...ticketItems[0]!,quantity:0.5},ticketItems[1]!],'INVALID_CHECKOUT_ITEM'],
  ['empty list',[],'INVALID_CHECKOUT_ITEMS'],
  ['blank name',[{...ticketItems[0]!,name:' '},ticketItems[1]!],'INVALID_CHECKOUT_ITEM'],
  ['oversized quantity',[{...ticketItems[0]!,quantity:10000},ticketItems[1]!],'INVALID_CHECKOUT_ITEM'],
  ['unsafe multiplication',[{...ticketItems[0]!,unitAmount:{currency:'USD',minor:Number.MAX_SAFE_INTEGER},quantity:9999}],'ITEM_TOTAL_MISMATCH'],
  ['negative amount',[{...ticketItems[0]!,unitAmount:{currency:'USD',minor:-3500}},ticketItems[1]!],'INVALID_MONEY'],
] as const)test(`itemized checkout refuses ${label} before claim or provider traffic`,async t=>{
  const {store,close}=await setup();t.after(close);let calls=0;const cmd=itemizedCommand(items.map(i=>({...i})));
  const core=new PaymentCore({store,provider:new SandboxPayPalProvider(sandbox,async()=>{calls++;throw Error('No traffic allowed');}),policy:ticketPolicy});
  await assert.rejects(()=>core.execute(cmd),e=>e instanceof PaymentError&&e.code===code);assert.equal(calls,0);assert.equal(await store.get(cmd.scope,cmd.operationId),null);
});
