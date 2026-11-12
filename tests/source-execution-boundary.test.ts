import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { closureFromFiles, sha256, SOURCE_LIMITS, objectHash, SourceExecutionService, DockerSourceExecutor } from "../packages/source-execution/src/index";
import { controlledReceipt, setupSourceExecution, controlledRunner } from "./source-execution-helpers";
import { importLocalSource } from "../packages/developer-tools/src/source-import";
const files = (source: Record<string, string>) => Object.entries(source).map(([path,content]) => ({ path, content, hash: sha256(content), bytes: Buffer.byteLength(content) }));
test("relative closure resolution rejects path escapes, ambiguity, case collisions and unsupported module capabilities", () => {
  const rejected: [Record<string,string>, string][] = [
    [{ "entry.ts": "import x from '../../escape'; export async function checkout() {return x;}" }, "SOURCE_EXECUTION_PATH"],
    [{ "entry.ts": "import x from '/etc/passwd'; export async function checkout() {return x;}" }, "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED"],
    [{ "entry.ts": "import x from './module'; export async function checkout() {return x;}", "module.ts": "export default 1", "module/index.ts": "export default 2" }, "SOURCE_EXECUTION_MODULE_AMBIGUOUS"],
    [{ "entry.ts": "export async function checkout(){}", "Case.ts": "export const x=1", "case.ts": "export const y=2" }, "SOURCE_EXECUTION_CASE_COLLISION"],
    [{ "entry.ts": "import {x} from './missing'; export async function checkout(){return x}" }, "SOURCE_EXECUTION_MODULE_MISSING"],
    [{ "entry.ts": "import {x} from './code.js'; export async function checkout(){return x}", "code.js": "export const x=1" }, "SOURCE_EXECUTION_LANGUAGE_UNSUPPORTED"],
    [{ "entry.ts": "import x from 'https://evil.invalid/mod'; export async function checkout(){return x}" }, "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED"],
    [{ "entry.ts": "import x from 'node:fs'; export async function checkout(){return x}" }, "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED"],
    [{ "entry.ts": "import {BrambleContext} from '@fracture/source-target'; export async function checkout(){return BrambleContext}" }, "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED"],
  ];
  for (const [source, code] of rejected) assert.throws(() => closureFromFiles(files(source), "entry.ts"), { code });
  for (const text of ["export async function checkout(){return import('node:fs')}", "export async function checkout(){return process.env}", "export async function checkout(){return require('node:fs')}", "export async function checkout(){return import.meta.url}", "export async function checkout(){return ({}).constructor}", "export async function checkout(){return ({} as Record<string,unknown>)[['con','structor'].join('')]}"]) assert.throws(() => closureFromFiles(files({"entry.ts":text}), "entry.ts"));
  assert.throws(() => closureFromFiles(files({"entry.ts":"export async function checkout(){}"}), "../entry.ts"));
});
test("closure limits bind actual UTF-8 bytes and source digests rather than claimed metadata", () => {
  const chain: Record<string,string> = {}; for(let i=0;i<65;i++)chain[i?`m${i}.ts`:"entry.ts"] = i<64?`import './m${i+1}'; export const n=${i};`:"export const end=true;";
  assert.throws(() => closureFromFiles(files(chain), "entry.ts"), { code:"SOURCE_EXECUTION_CLOSURE_LIMIT" });
  const large: Record<string,string> = {"entry.ts":Array.from({length:5},(_,i)=>`import './part${i}';`).join("")+"export async function checkout(){}"};for(let i=0;i<5;i++)large[`part${i}.ts`]="/*"+"x".repeat(450000)+"*/ export const value=1;";
  assert.throws(() => closureFromFiles(files(large), "entry.ts"), {code:"SOURCE_EXECUTION_CLOSURE_LIMIT"});
  const claimed = files({"entry.ts":"export async function checkout(){}"});claimed[0]!.content+="\n";assert.throws(()=>closureFromFiles(claimed,"entry.ts"),{code:"SOURCE_EXECUTION_INTEGRITY"});
});
test("genuine SourceAccessStore import refuses a symlink; no execution is admitted", async t => {
  const f=await setupSourceExecution(t);await writeFile(join(f.directory,"outside.ts"),"export const outside=true");await symlink(join(f.directory,"outside.ts"),join(f.repo,"linked.ts"));
  await assert.rejects(importLocalSource(f.sources,f.owner,{rootId:"owned",path:"repo",title:"Symlink refusal",requestId:randomUUID()},f.local),{code:"SOURCE_SYMLINK_DENIED"});assert.equal((await f.db.query("SELECT id FROM lab_source_execution_jobs_v1")).rowCount,0);
});
test("same owner cannot approve a forged snapshot/source document or changed plan body", async t => {
  const f=await setupSourceExecution(t),plan=(await f.prepare()).plan;
  const stored=(await f.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_source_execution_plans_v1 WHERE id=$1",[plan.id])).rows[0]!;
  const changed={...JSON.parse(stored.document),entryPath:"purchase.ts"};await f.db.query("UPDATE lab_source_execution_plans_v1 SET document=$2 WHERE id=$1",[plan.id,JSON.stringify(changed)]);
  await assert.rejects(f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()}),{code:"SOURCE_EXECUTION_INTEGRITY"});assert.equal((await f.db.query("SELECT id FROM lab_source_execution_jobs_v1")).rowCount,0);
});
test("execution window cannot be extended, while retained evidence stays readable within original authority", async t => {
  const f=await setupSourceExecution(t),plan=(await f.prepare(["happy"])).plan,input={planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()};const accepted=await f.service.approve(f.owner,input);await f.service.runNext("complete",{execute:async bundle=>controlledReceipt(bundle)});f.advance(SOURCE_LIMITS.planLifetimeMs+1);
  assert.equal((await f.service.getJob(f.owner,{jobId:accepted.job.id})).status,"passed");assert.equal((await f.service.report(f.owner,{jobId:accepted.job.id})).plan.expiresAt,plan.expiresAt);assert.equal((await f.service.approve(f.owner,input)).job.id,accepted.job.id);
  await assert.rejects(f.service.approve(f.owner,{...input,requestId:randomUUID()}),{code:"SOURCE_EXECUTION_PLAN_EXPIRED"});
});
test("claimed work revoked before execute is stopped immediately without a runner call", async t=>{
  const f=await setupSourceExecution(t),plan=(await f.prepare()).plan;await f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()});const claim=(await f.service.claimNext("claimed"))!;await f.db.query("UPDATE lab_developer_grants SET revoked_at=$2 WHERE id=$1",[f.owner.grantId,new Date().toISOString()]);let calls=0;const job=await f.service.executeClaim(claim,{execute:async b=>{calls++;return controlledReceipt(b)}});assert.equal(calls,0);assert.equal(job.status,"cancelled_confirmed");
});
for(const status of ["compiler_rejected","timeout","output_limited","protocol_rejected"] as const)test(`${status} remains separate from target assertion failure and stops later cases`,async t=>{
  const f=await setupSourceExecution(t),plan=(await f.prepare()).plan;await f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()});let calls=0;const job=await f.service.runNext("limits",{execute:async b=>{calls++;return controlledReceipt(b,status)}});assert.equal(job?.status,"inconclusive");assert.equal(job?.cases[0]?.status,status);assert.equal(job?.cases[1]?.status,"cancelled");assert.equal(calls,1);
});
test("changed engine, image, dependency or observed isolation cannot satisfy the original receipt binding",async t=>{
  const f=await setupSourceExecution(t),plan=(await f.prepare(["happy"])).plan;await f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()});const job=await f.service.runNext("isolation-tamper",{execute:async b=>{
    const receipt=controlledReceipt(b);const body={...receipt,isolation:{...receipt.isolation,configurationVerified:false}};const {receiptHash:_old,...rest}=body;return {...rest,receiptHash:objectHash(rest)};
  }});assert.equal(job?.status,"inconclusive");
});

test("tampered saved case selection cannot admit an easier scenario than the approved plan",async t=>{
  const f=await setupSourceExecution(t),plan=(await f.prepare(["lost"])).plan,approved=await f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()});await f.db.query("UPDATE lab_source_execution_cases_v1 SET scenario_id='happy' WHERE job_id=$1",[approved.job.id]);let calls=0;assert.equal(await f.service.runNext("case-tamper",{execute:async bundle=>{calls++;return controlledReceipt(bundle)}}),null);assert.equal(calls,0);assert.equal((await f.service.getJob(f.owner,{jobId:approved.job.id})).errorCode,"SOURCE_EXECUTION_INTEGRITY");
});
test("independent executor rejects an extended deadline before calling any Docker executable",async t=>{
  const f=await setupSourceExecution(t),plan=(await f.prepare(["happy"])).plan;await f.service.approve(f.owner,{planId:plan.id,expectedPlanHash:plan.planHash,requestId:randomUUID()});assert.equal(controlledRunner.engine,"docker");if(controlledRunner.engine!=="docker")throw new Error("test contract");const executor=new DockerSourceExecutor({identity:controlledRunner,dockerExecutable:"/never-invoked-source-test"});
  const job=await f.service.runNext("deadline-test",{execute:async bundle=>{const {bundleHash:_old,...rest}=bundle,changed={...rest,deadlineAt:new Date(Date.now()+600000).toISOString()};await assert.rejects(executor.execute({...changed,bundleHash:objectHash(changed)},new AbortController().signal),{code:"SOURCE_EXECUTION_DEADLINE_INVALID"});return controlledReceipt(bundle)}});assert.equal(job?.status,"passed");
});

test("host facade import reads no application .env and starts no network, script or source execution",async t=>{
  const {execFile}=await import("node:child_process"),{promisify}=await import("node:util"),{mkdtemp,mkdir,writeFile,rm}=await import("node:fs/promises"),{tmpdir}=await import("node:os"),{join}=await import("node:path");
  const directory=await mkdtemp(join(tmpdir(),"fracture-source-host-env-"));await writeFile(join(directory,".env"),"CONTROLLED_ENV_SENTINEL=never-read-this\n",{mode:0o600});t.after(()=>rm(directory,{recursive:true,force:true}));
  const result=await promisify(execFile)(process.execPath,["--import","tsx","tests/source-execution-host-boundary-child.mjs"],{cwd:process.cwd(),env:{NODE_ENV:"test",PATH:"/usr/bin:/bin",FRACTURE_WORKSPACE_ROOT:directory},timeout:15000,maxBuffer:16000});const receipt=JSON.parse(result.stdout);assert.equal(receipt.imported,true);assert.equal(receipt.envReadAttempts,0);assert.equal(receipt.networkAttempts,0);assert.equal(receipt.cases,9);
});
