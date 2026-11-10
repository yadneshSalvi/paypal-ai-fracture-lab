import test from 'node:test';
import type {TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,createDecipheriv,randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {config} from 'dotenv';
import {SqlPaymentStore,PostgresDatabase,SqliteDatabase,PaymentError,payloadHash} from '../packages/paypal-core/src/index.js';
import type {SqlDatabase,PaymentCommand,PaymentAction,OperationDocumentCodec,OperationDocumentContext,PaymentScope} from '../packages/paypal-core/src/index.js';
config({path:join(process.cwd(),'.env'),quiet:true});
const adapters:('sqlite'|'postgres')[]=process.env.DATABASE_URL?['sqlite','postgres']:['sqlite'];
function codec(key=randomBytes(32)):OperationDocumentCodec {
 const aad=(c:OperationDocumentContext)=>Buffer.from(JSON.stringify(['paycore-operation-v1',c.scope.tenantId,c.scope.projectId,c.operationId]));
 return {
  encode(plaintext,context){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(aad(context));const bytes=Buffer.concat([cipher.update(plaintext,'utf8'),cipher.final()]);return Buffer.concat([nonce,cipher.getAuthTag(),bytes]).toString('base64');},
  decode(ciphertext,context){const bytes=Buffer.from(ciphertext,'base64'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(aad(context));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');}
 };
}
function command(scope:PaymentScope={tenantId:randomUUID(),projectId:'codec-test'}):PaymentCommand {
 const id=randomUUID(),action:PaymentAction={kind:'create_order',intent:'CAPTURE',customId:id,money:{currency:'USD',minor:3500},savedWallet:{vaultId:'PRIVATE-VAULT-'+id,consentId:'private-consent',consentVersion:1,consentDigest:'private-digest',paymentInitiator:'MERCHANT',usagePattern:'UNSCHEDULED_PREPAID',usage:'DERIVED'}};
 return {scope,operationId:id,businessKey:'contribution:'+id,intentId:'intent:'+id,providerRequestId:'request:'+id,payloadHash:payloadHash(action),action,approval:{id:'approval:'+id,version:1,digest:'digest',expiresAt:new Date(Date.now()+3600000).toISOString()}};
}
async function database(t:TestContext,adapter:'sqlite'|'postgres'){
 const dir=await mkdtemp(join(tmpdir(),'paycore-codec-'));const db:SqlDatabase=adapter==='postgres'?new PostgresDatabase(process.env.DATABASE_URL!):new SqliteDatabase(join(dir,'store.sqlite'));
 t.after(async()=>{await db.close();await rm(dir,{recursive:true,force:true});});await new SqlPaymentStore(db).initialize();return db;
}
const unavailable=(error:unknown)=>error instanceof PaymentError&&error.code==='OPERATION_DOCUMENT_UNAVAILABLE'&&!error.message.includes('PRIVATE');
async function raw(db:SqlDatabase,cmd:PaymentCommand){return (await db.query<{document:string}>('SELECT document FROM paycore_operations WHERE tenant_id=$1 AND project_id=$2 AND id=$3',[cmd.scope.tenantId,cmd.scope.projectId,cmd.operationId])).rows[0]!.document;}
for(const adapter of adapters){
 test(adapter+': encrypted operation survives a fresh store, duplicate claim, transitions and retry',async t=>{
  const db=await database(t,adapter),documentCodec=codec(),store=new SqlPaymentStore(db,{operationDocumentCodec:documentCodec}),cmd=command();
  const results=await Promise.all(Array.from({length:8},()=>store.claim(cmd)));assert.equal(results.filter(x=>x.won).length,1);const ciphertext=await raw(db,cmd);
  assert.equal(ciphertext.includes('PRIVATE-VAULT'),false);assert.equal(ciphertext.includes('private-consent'),false);assert.equal(JSON.parse(ciphertext).paycoreEncoding,'operation-v1');
  const reopened=new SqlPaymentStore(db,{operationDocumentCodec:documentCodec});await reopened.initialize();assert.deepEqual((await reopened.get(cmd.scope,cmd.operationId))?.command,cmd);assert.equal((await reopened.list(cmd.scope)).length,1);
  const refused=await reopened.transition(cmd.scope,cmd.operationId,1,'not_sent',null,{kind:'auth',message:'Before dispatch',httpStatus:502});const reclaimed=await reopened.reclaim(cmd,refused.version);assert.deepEqual(reclaimed.command.action,cmd.action);assert.equal(reclaimed.status,'claimed');assert.equal((await raw(db,cmd)).includes('PRIVATE-VAULT'),false);
 });
 test(adapter+': encrypted operation rejects missing codec and wrong key without returning private content',async t=>{
  const db=await database(t,adapter),cmd=command(),store=new SqlPaymentStore(db,{operationDocumentCodec:codec()});await store.claim(cmd);
  await assert.rejects(new SqlPaymentStore(db).get(cmd.scope,cmd.operationId),unavailable);await assert.rejects(new SqlPaymentStore(db,{operationDocumentCodec:codec()}).get(cmd.scope,cmd.operationId),unavailable);
 });
 test(adapter+': authenticated context prevents ciphertext swapping across row identities',async t=>{
  const db=await database(t,adapter),store=new SqlPaymentStore(db,{operationDocumentCodec:codec()}),one=command(),two=command(one.scope),otherTenant=command({tenantId:randomUUID(),projectId:one.scope.projectId}),otherProject=command({tenantId:one.scope.tenantId,projectId:'other-project'});
  await store.claim(one);const ciphertext=await raw(db,one);
  for(const target of [two,otherTenant,otherProject]){await store.claim(target);await db.query('UPDATE paycore_operations SET document=$4 WHERE tenant_id=$1 AND project_id=$2 AND id=$3',[target.scope.tenantId,target.scope.projectId,target.operationId,ciphertext]);await assert.rejects(store.get(target.scope,target.operationId),unavailable);}
  assert.deepEqual((await store.get(one.scope,one.operationId))?.command,one);
 });
 test(adapter+': existing plaintext remains readable and becomes encrypted on next transition',async t=>{
  const db=await database(t,adapter),plain=new SqlPaymentStore(db),cmd=command();await plain.claim(cmd);assert.ok((await raw(db,cmd)).includes('PRIVATE-VAULT'));
  const encrypted=new SqlPaymentStore(db,{operationDocumentCodec:codec()});assert.deepEqual((await encrypted.get(cmd.scope,cmd.operationId))?.command,cmd);await encrypted.transition(cmd.scope,cmd.operationId,1,'dispatching',null,null);assert.equal((await raw(db,cmd)).includes('PRIVATE-VAULT'),false);
 });
 test(adapter+': codec failure rolls back claim and does not mask credentials in errors',async t=>{
  const db=await database(t,adapter),cmd=command(),store=new SqlPaymentStore(db,{operationDocumentCodec:{encode(){throw new Error('PRIVATE-VAULT');},decode(){throw new Error('PRIVATE-VAULT');}}});await assert.rejects(store.claim(cmd),unavailable);assert.equal(await new SqlPaymentStore(db).get(cmd.scope,cmd.operationId),null);
 });
 test(adapter+': encrypted reservations retain concurrent budget protection',async t=>{
  const db=await database(t,adapter),store=new SqlPaymentStore(db,{operationDocumentCodec:codec()}),one=command(),two=command(one.scope);const budget={resourceKey:'wallet-budget',currency:'USD',totalMinor:3500,externallyConsumedMinor:0,observedProviderIds:[],observedAt:new Date().toISOString()};
  const results=await Promise.allSettled([store.claim(one,budget),store.claim(two,budget)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const failure=results.find(x=>x.status==='rejected');assert.ok(failure?.status==='rejected'&&failure.reason instanceof PaymentError&&failure.reason.code==='RESOURCE_BUDGET_EXCEEDED');
 });
}
