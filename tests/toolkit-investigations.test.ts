import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256, PostgresDatabase, SqliteDatabase, type SqlDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabStore, LabService, LabError } from "../packages/service/src/index";
import { ToolkitInvestigations } from "../packages/ai/src/investigations";
import { GeminiInteractionModel } from "../packages/ai/src/gemini";
import { modelAttemptIdentity } from "../packages/ai/src/model";
import { modelToolkitReview, selectToolkitOrder, readSelectedToolkitOrder, concludeToolkitReview } from "../packages/ai/src/toolkit-review";
import { investigationReportHtml } from "../packages/ai/src/investigation-report";
import { DeveloperAccess } from "../packages/developer-tools/src/access";
process.env.JUDGE_SESSION_SECRET ??= "fixture-toolkit-context-key";
process.env.GEMINI_API_KEY ??= "fixture-gemini-no-network";
process.env.GEMINI_MODEL ??= "fixture-gemini";
const adapters = process.env.DATABASE_URL ? ["sqlite", "postgres"] as const : ["sqlite"] as const;
async function setup(t: TestContext, adapter: "sqlite" | "postgres" = "sqlite", owner = false) {
  const directory = await mkdtemp(join(tmpdir(), "fracture-toolkit-review-"));
  let db: SqlDatabase; let cleanup = async () => {};
  if (adapter === "postgres") {
    const admin = new PostgresDatabase(process.env.DATABASE_URL!);
    const schema = `toolkit_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(process.env.DATABASE_URL!); url.searchParams.set("options", `-c search_path=${schema}`);
    db = new PostgresDatabase(url.toString());
    cleanup = async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.close(); };
  } else db = new SqliteDatabase(join(directory, "test.sqlite"));
  await initializeDatabase(db);
  const store = new LabStore(db), service = new LabService(store);
  const access = new DeveloperAccess(service), grant = owner ? await access.create() : null;
  const session = grant?.session ?? await store.createSession("judge");
  const run = await service.startRun(session.id, { projectId: "bramble", scenarioId: "S0", revision: "faulty", mode: "sample", seed: "toolkit-investigation-fixture", requestId: randomUUID(), interactive: false });
  const reviews = new ToolkitInvestigations(store);
  t.after(async () => { await db.close(); await cleanup(); await rm(directory, { recursive: true, force: true }); });
  return { db, store, service, session, run, reviews, access, grant };
}
const code = (expected: string) => (error: unknown) => error instanceof LabError && error.code === expected;
function provider() {
  const requests: Record<string, any>[] = [];
  const wire: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); requests.push(body);
    if (!body.previous_interaction_id) return Response.json({ id: "interaction_original", model: "fixture-gemini", status: "requires_action", steps: [{ type: "thought", content: "PRIVATE_THOUGHT_MUST_NOT_EXPORT", signature: "PRIVATE_OPAQUE_SIGNATURE" }, { type: "function_call", id: "call_original", name: "get_order", arguments: { id: JSON.parse(body.input[0].text).wireOrderId } }] });
    return Response.json({ id: "interaction_conclusion", model: "fixture-gemini", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({ conclusion: "The original Sample order is completed; a missing answer does not establish a failed payment.", observedOrderStatus: "COMPLETED", uncertainty: ["This is a controlled Sample observation, not live payment evidence."] }) }] }] });
  };
  return { wire, requests };
}
for (const adapter of adapters) {
  test(`${adapter}: revocation blocks retained reads and queued work without extending the original session`, async t => {
    const { db, store, session, run, reviews, access, grant } = await setup(t, adapter, true);
    const requestId = randomUUID(), review = await reviews.begin(session.id, run.id, requestId);
    const resources = canonicalJson(await store.resources(run.id));
    await access.revoke(grant!.credential);
    for (const operation of [
      () => reviews.list(session.id), () => reviews.get(session.id, review.id),
      () => reviews.findByRequest(session.id, requestId), () => reviews.report(session.id, review.id),
      () => reviews.cancel(session.id, review.id), () => reviews.resume(session.id, review.id),
      () => reviews.begin(session.id, run.id, randomUUID()),
    ]) await assert.rejects(operation(), code("DEVELOPER_ACCESS_DENIED"));
    assert.deepEqual(await reviews.advance(review.id, { modelFactory: () => { throw new Error("Revoked work must not dispatch a model."); } }), { done: true, status: "cancelled" });
    assert.equal((await db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
    assert.equal((await db.query("SELECT id FROM lab_toolkit_commands")).rowCount, 0);
    assert.equal(canonicalJson(await store.resources(run.id)), resources);
    assert.equal((await store.session(session.id))?.expiresAt, session.expiresAt);
    assert.equal((await db.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 AND status='cancelled'", [review.id])).rowCount, 1);
  });
  test(`${adapter}: read-only listing creates no schema, and three fresh workers retain one owned investigation`, async t => {
    const { db, store, session, run, reviews } = await setup(t, adapter);
    assert.deepEqual(await reviews.list(session.id), []);
    assert.equal(await reviews.available(), false);
    const before = canonicalJson(await store.resources(run.id));
    const requestId = randomUUID();
    const [first, duplicate] = await Promise.all([reviews.begin(session.id, run.id, requestId), reviews.begin(session.id, run.id, requestId)]);
    assert.equal(first.id, duplicate.id); assert.equal(first.status, "queued");
    assert.equal((await reviews.findByRequest(session.id, requestId))?.id, first.id);
    assert.equal((await db.query("SELECT id FROM lab_actions")).rowCount, 1);
    assert.equal((await db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
    const { wire, requests } = provider();
    const options = { modelFactory: (id: string, signal: AbortSignal) => new GeminiInteractionModel(store, id, wire, signal) };
    assert.deepEqual(await new ToolkitInvestigations(store).advance(first.id, options), { done: false, status: "queued" });
    assert.equal((await reviews.get(session.id, first.id)).phase, "read");
    assert.equal(requests.length, 1);
    assert.deepEqual(await new ToolkitInvestigations(store).advance(first.id, options), { done: false, status: "queued" });
    assert.equal((await reviews.get(session.id, first.id)).phase, "conclusion");
    assert.equal(requests.length, 1, "The actual Toolkit read is its own phase, not a model request.");
    assert.deepEqual(await new ToolkitInvestigations(store).advance(first.id, options), { done: true, status: "completed" });
    assert.deepEqual(await new ToolkitInvestigations(store).advance(first.id, options), { done: true, status: "completed" });
    assert.equal(requests.length, 2);
    assert.equal(requests[1]!.previous_interaction_id, "interaction_original");
    const complete = await reviews.get(session.id, first.id);
    assert.equal(complete.result?.observedOrderStatus, "COMPLETED");
    assert.equal((await store.run(run.id)).events.filter(event => event.kind === "resource_read").length, 1);
    assert.equal(canonicalJson(await store.resources(run.id)), before);
    const report = await reviews.report(session.id, first.id);
    assert.equal(report.evidence.length, 4);
    const actualRead = report.evidence.find(item => item.id === complete.receiptIds.read)!;
    assert.deepEqual(actualRead.body.workerBoundary, { node: process.version, environmentKeys: ["NODE_ENV"], execArgvCount: 0, workerDataKeys: ["callId", "wireOrderId"] });
    for (const privateValue of ["PRIVATE_THOUGHT_MUST_NOT_EXPORT", "PRIVATE_OPAQUE_SIGNATURE", process.env.GEMINI_API_KEY!]) assert.ok(!JSON.stringify(report).includes(privateValue));
    const { sha256: digest, ...body } = report; assert.equal(digest, sha256(canonicalJson(body)));
    const foreign = await store.createSession("judge");
    assert.equal(await reviews.findByRequest(foreign.id, requestId), null);
    assert.deepEqual(await reviews.list(foreign.id), []);
    await assert.rejects(reviews.get(foreign.id, first.id), code("INVESTIGATION_NOT_FOUND"));
    await assert.rejects(reviews.report(foreign.id, first.id), code("INVESTIGATION_NOT_FOUND"));
    await assert.rejects(reviews.cancel(foreign.id, first.id), code("INVESTIGATION_NOT_FOUND"));
  });
  test(`${adapter}: a known stopped workflow resumes original saved phases, while an unknown model create never redispatches`, async t => {
    const { db, store, session, run, reviews } = await setup(t, adapter);
    const first = await reviews.begin(session.id, run.id, randomUUID());
    await reviews.recordWorkflow(first.id, 0, "original-workflow");
    await reviews.workflowStopped(first.id, 0, "original-workflow");
    assert.equal((await reviews.get(session.id, first.id)).status, "waiting");
    const resumed = await reviews.resume(session.id, first.id);
    assert.equal(resumed.id, first.id); assert.equal(resumed.dispatchVersion, 1);
    let calls = 0;
    const wire: typeof fetch = async () => { calls++; throw new TypeError("Controlled unknown outcome"); };
    await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) });
    assert.equal((await reviews.get(session.id, first.id)).status, "failed");
    await reviews.resume(session.id, first.id);
    await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) });
    assert.equal(calls, 1);
    assert.equal((await db.query("SELECT id FROM lab_model_attempts")).rowCount, 1);
  });
  test(`${adapter}: a lost worker with an unresolved original attempt is retained as failed without another request`, async t => {
    const { db, store, session, run, reviews } = await setup(t, adapter);
    const first = await reviews.begin(session.id, run.id, randomUUID());
    const attemptId = modelAttemptIdentity(session.id, first.actionId, "toolkit_order_selection");
    await db.query("UPDATE lab_toolkit_reviews SET status='running',lease_owner='lost-worker',lease_until='2000-01-01T00:00:00.000Z' WHERE id=$1", [first.id]);
    await db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,'toolkit_order_selection','running',$4)", [attemptId, session.id, run.id, JSON.stringify({ attemptId, status: "running", originalMarker: "retained" })]);
    let calls = 0;
    await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, async () => { calls++; throw Error("Must not dispatch"); }) });
    assert.equal(calls, 0);
    const stopped = await reviews.get(session.id, first.id);
    assert.equal(stopped.status, "failed"); assert.equal(stopped.errorCode, "MODEL_DISPATCH_UNKNOWN");
    const attempt = (await db.query<{ status: string; document: string } & Record<string, unknown>>("SELECT status,document FROM lab_model_attempts WHERE id=$1", [attemptId])).rows[0]!;
    assert.equal(attempt.status, "failed"); assert.equal(JSON.parse(attempt.document).originalMarker, "retained");
  });
  test(`${adapter}: duplicate resume/stop acknowledgements retain one command and cannot change another operation`, async t => {
    const { db, session, run, reviews } = await setup(t, adapter);
    const first = await reviews.begin(session.id, run.id, randomUUID());
    await reviews.recordWorkflow(first.id, 0, "stopped-workflow");
    await reviews.workflowStopped(first.id, 0, "stopped-workflow");
    const resumeId = randomUUID();
    const results = await Promise.all([reviews.resume(session.id, first.id, resumeId), reviews.resume(session.id, first.id, resumeId)]);
    assert.deepEqual(results.map(item => item.dispatchVersion), [1, 1]);
    assert.equal((await db.query("SELECT id FROM lab_toolkit_commands")).rowCount, 1);
    await assert.rejects(reviews.cancel(session.id, first.id, resumeId), code("ACTION_CONFLICT"));
    const cancelId = randomUUID();
    await reviews.cancel(session.id, first.id, cancelId); await reviews.cancel(session.id, first.id, cancelId);
    const report = await reviews.report(session.id, first.id);
    assert.equal(report.review.status, "cancelled");
    assert.deepEqual(report.commands.map(item => item.action), ["resume", "cancel"]);
    assert.equal((await db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
  });
  test(`${adapter}: stopping while the provider answer is pending fences late publication`, async t => {
    const { db, store, session, run, reviews } = await setup(t, adapter);
    const first = await reviews.begin(session.id, run.id, randomUUID());
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const { wire, requests } = provider();
    const delayed: typeof fetch = async (url, init) => { entered(); await gate; return wire(url, init); };
    const running = reviews.advance(first.id, { modelFactory: (id, signal) => new GeminiInteractionModel(store, id, delayed, signal) });
    await started; await reviews.cancel(session.id, first.id, randomUUID()); release(); await running;
    const retained = await reviews.get(session.id, first.id);
    assert.equal(retained.status, "cancelled"); assert.equal(retained.result, null);
    assert.deepEqual(retained.availableReceiptIds, []); assert.equal(requests.length, 1);
    const attempt = (await db.query<{ status: string } & Record<string, unknown>>("SELECT status FROM lab_model_attempts")).rows[0];
    assert.equal(attempt?.status, "cancelled");
    assert.equal((await store.run(run.id)).events.filter(item => item.kind === "resource_read").length, 0);
  });
}

test("a fresh worker reuses the exact read receipt, and cancellation cannot publish a new conclusion", async t => {
  const { store, session, run } = await setup(t);
  const actionId = randomUUID(); await store.claimAction(session.id, run.id, actionId, "diagnose", {});
  const { wire, requests } = provider();
  await selectToolkitOrder(store, session.id, run, new GeminiInteractionModel(store, actionId, wire));
  const firstRead = await readSelectedToolkitOrder(store, session.id, run, actionId);
  const restored = await readSelectedToolkitOrder(store, session.id, run, actionId);
  assert.deepEqual(restored, firstRead);
  const first = await concludeToolkitReview(store, session.id, run, new GeminiInteractionModel(store, actionId, wire));
  const repeated = await modelToolkitReview(store, session.id, run, new GeminiInteractionModel(store, actionId, wire));
  assert.deepEqual(repeated, first);
  assert.equal(requests.length, 2);
  assert.equal((await store.run(run.id)).events.filter(event => event.kind === "resource_read").length, 1);
  await store.finishAction(actionId, session.id, "cancelled");
  await assert.rejects(concludeToolkitReview(store, session.id, run, new GeminiInteractionModel(store, actionId, wire)), code("WORK_CANCELLED"));
  assert.equal(requests.length, 2);
});

test("cancellation and changed model configuration stop before the next phase while retaining earlier observations", async t => {
  const { store, session, run, reviews } = await setup(t);
  const first = await reviews.begin(session.id, run.id, randomUUID());
  const { wire, requests } = provider();
  await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) });
  const cancelled = await reviews.cancel(session.id, first.id);
  assert.equal(cancelled.status, "cancelled");
  await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) });
  assert.equal(requests.length, 1);
  assert.equal((await store.evidence(session.id)).filter(item => item.title === "Model-selected Toolkit order read").length, 0);
  const second = await reviews.begin(session.id, run.id, randomUUID());
  const original = process.env.GEMINI_MODEL; process.env.GEMINI_MODEL = "changed-fixture-model";
  try { await reviews.advance(second.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) }); } finally { process.env.GEMINI_MODEL = original; }
  assert.equal((await reviews.get(session.id, second.id)).errorCode, "MODEL_CONFIGURATION_CHANGED");
  assert.equal(requests.length, 1);
});

test("portable reports escape model text, and a missing original receipt cannot display a completed chain", async t => {
  const { db, store, session, run, reviews } = await setup(t);
  const first = await reviews.begin(session.id, run.id, randomUUID());
  const { wire } = provider();
  for (let i = 0; i < 3; i++) await reviews.advance(first.id, { modelFactory: id => new GeminiInteractionModel(store, id, wire) });
  const report = await reviews.report(session.id, first.id);
  report.review.result!.conclusion = '<script>alert("private")</script><img src="https://example.invalid/" onerror="steal()">';
  const html = investigationReportHtml(report);
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("<img "));
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(html.includes("default-src 'none'"));
  assert.ok(!html.includes("PRIVATE_OPAQUE_SIGNATURE"));
  await db.query("DELETE FROM lab_evidence WHERE id=$1", [first.receiptIds.selection]);
  await assert.rejects(reviews.get(session.id, first.id), code("INVESTIGATION_EVIDENCE_CHANGED"));
  await assert.rejects(reviews.report(session.id, first.id), code("INVESTIGATION_EVIDENCE_CHANGED"));
});
