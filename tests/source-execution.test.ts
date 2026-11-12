import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { controlledReceipt, controlledRunner, setupSourceExecution } from "./source-execution-helpers";
import { SourceExecutionService, sha256, SOURCE_EXECUTION_PROTOCOL, verifyBundle, objectHash } from "../packages/source-execution/src/index";
import type { SourceExecutionBundle } from "../packages/source-execution/src/index";

test("accepted multi-file source is sealed from SourceAccessStore; mutable host deletion cannot substitute it", async t => {
  const f = await setupSourceExecution(t), baseline = JSON.stringify(await f.sources.get(f.owner.sessionId, f.imported.import.id));
  const result = await f.prepare(); assert.equal(result.plan.closure.files.length, 3); assert.equal(result.plan.entryPath, "entry.ts"); assert.ok(result.plan.closure.edges.some(edge => edge.to === "purchase.ts"));
  await rm(f.repo, { recursive: true });
  assert.deepEqual(await f.service.getPlan(f.owner, { planId: result.plan.id }), result.plan);
  const accepted = await f.service.approve(f.owner, { planId: result.plan.id, expectedPlanHash: result.plan.planHash, requestId: randomUUID() });
  const seen: SourceExecutionBundle[] = []; const job = await f.service.runNext("worker-a", { execute: async bundle => { seen.push(bundle); return controlledReceipt(bundle); } });
  assert.equal(job?.status, "passed"); assert.equal(seen.length, 2); assert.ok(seen.every(bundle => bundle.files.some(file => file.content.includes("controlled-import-corrected-multi-file-v1"))));
  assert.equal(JSON.stringify(await f.sources.get(f.owner.sessionId, f.imported.import.id)), baseline);
  const report = await f.service.report(f.owner, { jobId: accepted.job.id }); assert.equal(report.privacy, "private_source_bearing"); assert.equal(report.artifacts.length, 2); assert.equal(report.originalImportExecution, "static_only"); assert.equal(report.plan.planHash, result.plan.planHash);
});
test("concurrent equal prepare and approval commands recover one plan/job; changed valid payload conflicts", async t => {
  const f = await setupSourceExecution(t), input = { importId: f.imported.import.id, entryPath: "entry.ts", expectedRevisionHash: f.imported.snapshot!.revisionHash, scenarioIds: ["happy" as const], seed: "same-seed", requestId: randomUUID() };
  const prepared = await Promise.all(Array.from({ length: 5 }, () => f.service.prepare(f.owner, input))); assert.equal(new Set(prepared.map(value => value.plan.id)).size, 1);
  await assert.rejects(f.service.prepare(f.owner, { ...input, seed: "different" }), { code: "SOURCE_EXECUTION_REQUEST_CONFLICT" });
  const plan = prepared[0]!.plan, approve = { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() };
  const accepted = await Promise.all(Array.from({ length: 5 }, () => f.service.approve(f.owner, approve))); assert.equal(new Set(accepted.map(value => value.job.id)).size, 1);
  const another = (await f.prepare(["lost"])).plan;
  await assert.rejects(f.service.approve(f.owner, { ...approve, planId: another.id, expectedPlanHash: another.planHash }), { code: "SOURCE_EXECUTION_REQUEST_CONFLICT" });
  assert.equal((await f.service.getCommand(f.owner, approve.requestId))?.resourceId, accepted[0]!.job.id);
  assert.equal((await f.db.query("SELECT id FROM lab_source_execution_jobs_v1")).rowCount, 1);
});
test("one CAS claim and one execute transition prevent independent workers from running a job twice", async t => {
  const f = await setupSourceExecution(t), p = (await f.prepare(["happy"])).plan; await f.service.approve(f.owner, { planId: p.id, expectedPlanHash: p.planHash, requestId: randomUUID() });
  const second = new SourceExecutionService(f.lab, f.sources, controlledRunner, { now: f.now });
  const claims = await Promise.all([f.service.claimNext("first"), second.claimNext("second")]); assert.equal(claims.filter(Boolean).length, 1); const claim = claims.find(Boolean)!;
  let calls = 0; const executor = { execute: async (bundle: SourceExecutionBundle) => { calls++; return controlledReceipt(bundle); } };
  await Promise.all([f.service.executeClaim(claim, executor), second.executeClaim(claim, executor)]); assert.equal(calls, 1);
});
test("ambiguous executor acceptance retains original external identity and is never redispatched", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare()).plan, input = { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() }, approved = await f.service.approve(f.owner, input); let calls = 0;
  const job = await f.service.runNext("unknown-worker", { execute: async () => { calls++; throw new Error("ack lost"); } });
  assert.equal(job?.status, "inconclusive"); assert.equal(job?.cases[0]?.status, "inconclusive"); assert.equal(job?.cases[0]?.executionId, approved.job.cases[0]?.executionId); assert.equal((await f.service.approve(f.owner, input)).job.id, approved.job.id); assert.equal(await f.service.runNext("fresh-worker", { execute: async b => { calls++; return controlledReceipt(b); } }), null); assert.equal(calls, 1);
  const report = await f.service.report(f.owner, { jobId: approved.job.id }); assert.equal(report.artifacts[0]?.kind, "unknown_outcome");
});
test("view-only browser, different owner and a different grant in the same session cannot execute/read private plans", async t => {
  const f = await setupSourceExecution(t), browser = await f.lab.createSession(), connection = await f.sources.connect(browser.id, randomUUID()); await f.sources.approve(f.owner, { connectionId: connection.id, importId: f.imported.import.id, requestId: randomUUID() });
  assert.equal((await f.sources.get(browser.id, f.imported.import.id)).import.access, "approved_view"); const plan = (await f.prepare()).plan;
  await assert.rejects(f.service.getPlan({ sessionId: browser.id, grantId: f.owner.grantId }, { planId: plan.id }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" });
  const alternate = randomUUID(); await f.db.query("INSERT INTO lab_developer_grants(id,session_id,secret_hash,created_at,expires_at) SELECT $1,session_id,secret_hash,created_at,expires_at FROM lab_developer_grants WHERE id=$2", [alternate, f.owner.grantId]);
  await assert.rejects(f.service.approve({ ...f.owner, grantId: alternate }, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" });
});
test("original grant fingerprint and full expiry are fixed; no extension or replacement revives a plan", async t => {
  const f = await setupSourceExecution(t), expiry = new Date(f.now() + 2000).toISOString(); await f.db.query("UPDATE lab_developer_grants SET expires_at=$2 WHERE id=$1", [f.owner.grantId, expiry]);
  const plan = (await f.prepare()).plan; assert.equal(plan.authority.grantExpiresAt, expiry); assert.equal(plan.expiresAt, expiry);
  await f.db.query("UPDATE lab_developer_grants SET secret_hash=$2 WHERE id=$1", [f.owner.grantId, sha256("different-controlled-token")]); await assert.rejects(f.service.getPlan(f.owner, { planId: plan.id }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" });
  await f.db.query("UPDATE lab_developer_grants SET secret_hash=$2,expires_at=$3 WHERE id=$1", [f.owner.grantId, sha256("controlled-source-execution-only"), new Date(f.now() + 900000).toISOString()]);
  await assert.rejects(f.service.getPlan(f.owner, { planId: plan.id }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" }); f.advance(2001); await assert.rejects(f.service.getPlan(f.owner, { planId: plan.id }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" });
});
test("revocation before claim stops work with no executor admission", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare()).plan; await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  await f.db.query("UPDATE lab_developer_grants SET revoked_at=$2 WHERE id=$1", [f.owner.grantId, new Date().toISOString()]); let calls = 0; assert.equal(await f.service.runNext("revoked-worker", { execute: async b => { calls++; return controlledReceipt(b); } }), null); assert.equal(calls, 0);
  assert.equal((await f.db.query("SELECT status FROM lab_source_execution_jobs_v1")).rows[0]?.status, "cancelled_confirmed");
});
test("revocation during execution withholds late success, denies source export and prevents another case", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare()).plan, approved = await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  let release!: () => void, started!: () => void; const entered = new Promise<void>(resolve => { started = resolve; }), wait = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  const running = f.service.runNext("revocation-worker", { execute: async bundle => { calls++; started(); await wait; return controlledReceipt(bundle); } }); await entered;
  await f.db.query("UPDATE lab_developer_grants SET revoked_at=$2 WHERE id=$1", [f.owner.grantId, new Date().toISOString()]); release(); const job = await running; assert.notEqual(job?.status, "passed"); assert.equal(calls, 1); assert.equal(job?.cases[1]?.status, "cancelled");
  await assert.rejects(f.service.report(f.owner, { jobId: approved.job.id }), { code: "SOURCE_EXECUTION_ACCESS_DENIED" }); assert.equal((await f.db.query("SELECT id FROM lab_source_execution_artifacts_v1")).rowCount, 1);
});
test("cancel preserves a completed failure, aborts current work and distinguishes confirmed versus unknown cleanup", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare(["lost", "happy", "pending"])).plan, approved = await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  let entered!: () => void; const started = new Promise<void>(resolve => { entered = resolve; }); let calls = 0;
  const work = f.service.runNext("cancel-worker", { execute: async (bundle, signal) => { calls++; if (calls === 1) return controlledReceipt(bundle, "failed"); entered(); await new Promise<void>(resolve => { if (signal.aborted) resolve(); else signal.addEventListener("abort", () => resolve(), { once: true }); }); return controlledReceipt(bundle, "cancelled"); } }); await started;
  const cancel = { jobId: approved.job.id, requestId: randomUUID() }; await f.service.cancel(f.owner, cancel); const job = await work;
  assert.equal(job?.status, "cancelled_confirmed"); assert.deepEqual(job?.cases.map(item => item.status), ["failed", "cancelled", "cancelled"]); assert.equal(calls, 2); assert.equal((await f.service.cancel(f.owner, cancel)).job.id, approved.job.id);
  const secondPlan = (await f.prepare(["happy"])).plan; await f.service.approve(f.owner, { planId: secondPlan.id, expectedPlanHash: secondPlan.planHash, requestId: randomUUID() }); const unknown = await f.service.runNext("cleanup-unknown", { execute: async b => controlledReceipt(b, "passed", "unknown") }); assert.equal(unknown?.status, "inconclusive"); assert.equal(unknown?.cases[0]?.status, "inconclusive");
});
test("expired interrupted claim retains uncertainty and cannot be executed by a new worker", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare(["happy"])).plan; await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() }); const claim = (await f.service.claimNext("interrupted"))!; f.advance(Date.parse(claim.leaseUntil) - f.now() + 1);
  assert.equal(await f.service.claimNext("replacement"), null); let calls = 0; const job = await f.service.executeClaim(claim, { execute: async b => { calls++; return controlledReceipt(b); } }); assert.equal(job.status, "inconclusive"); assert.equal(calls, 0);
});
test("tampered source/entry/suite/bundle and injected receipt fields fail closed with retained unknown evidence", async t => {
  const f = await setupSourceExecution(t), plan = (await f.prepare(["happy"])).plan; await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  const job = await f.service.runNext("tamper-worker", { execute: async bundle => {
    assert.throws(() => verifyBundle({ ...bundle, entryPath: "purchase.ts" })); assert.throws(() => verifyBundle({ ...bundle, files: bundle.files.map((file,index) => index ? file : { ...file, content: file.content + "\n" }) })); assert.throws(() => verifyBundle({ ...bundle, binding: { ...bundle.binding, suiteHash: "f".repeat(64) } }));
    return { ...controlledReceipt(bundle), injectedOutcome: "passed" } as ReturnType<typeof controlledReceipt>;
  } }); assert.equal(job?.status, "inconclusive"); assert.equal((await f.service.report(f.owner, { jobId: job!.id })).artifacts[0]?.kind, "unknown_outcome");
});
test("unsupported dependency rejection is durable and does not execute an imported package script", async t => {
  const f = await setupSourceExecution(t, { files: { "entry.ts": "import http from 'node:http'; export async function checkout(){ return http; }", "package.json": '{"scripts":{"test":"touch /tmp/should-never-execute"}}' } });
  const input = { importId: f.imported.import.id, entryPath: "entry.ts", expectedRevisionHash: f.imported.snapshot!.revisionHash, scenarioIds: ["happy" as const], seed: "rejection", requestId: randomUUID() };
  await assert.rejects(f.service.prepare(f.owner, input), { code: "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED" }); await assert.rejects(f.service.prepare(f.owner, input), { code: "SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED" }); const receipt = await f.service.getCommand(f.owner, input.requestId); assert.equal(receipt?.status, "rejected"); assert.equal((await f.db.query("SELECT id FROM lab_source_execution_jobs_v1")).rowCount, 0); assert.equal(f.imported.snapshot?.tools.commandsExecuted, 0);
});
