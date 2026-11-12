import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabStore, LabService, LabError } from "../packages/service/src/index";
import { ownedToolkitRead } from "../packages/ai/src/toolkit-read";
import { GeminiInteractionModel } from "../packages/ai/src/gemini";
import type { GeminiCall } from "../packages/ai/src/gemini";
import { modelToolkitReview } from "../packages/ai/src/toolkit-review";

process.env.JUDGE_SESSION_SECRET ??= "fixture-toolkit-context-key";
process.env.GEMINI_API_KEY = "fixture-gemini-never-network";
process.env.GEMINI_MODEL = "fixture-gemini";
async function setup(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "fracture-toolkit-read-"));
  const db = new SqliteDatabase(join(directory, "test.sqlite"));
  await initializeDatabase(db);
  const store = new LabStore(db);
  const session = await store.createSession("judge");
  const run = await new LabService(store).startRun(session.id, { projectId: "bramble", scenarioId: "S0", revision: "faulty", mode: "sample", seed: "toolkit-read-regression", requestId: randomUUID(), interactive: false });
  const actionId = randomUUID();
  await store.claimAction(session.id, run.id, actionId, "toolkit_review", {});
  t.after(async () => { await db.close(); await rm(directory, { recursive: true, force: true }); });
  return { db, store, session, run, actionId };
}
const code = (value: string) => (error: unknown) => error instanceof LabError && error.code === value;

test("the actual installed Toolkit reads only the aliased original order and changes no resources", async t => {
  const { store, session, run } = await setup(t);
  const before = await store.resources(run.id);
  const read = await ownedToolkitRead(store, session.id, run.id, run.orderIds[0]!);
  assert.match(read.wireOrderId, /^[A-Z0-9]{17,32}$/);
  assert.notEqual(read.wireOrderId, read.orderId);
  assert.equal(read.tool.name, "get_order");
  const receipt = await read.execute("get_order", { id: read.wireOrderId }, "call_owned_read");
  assert.deepEqual(await store.resources(run.id), before);
  assert.equal((receipt.body.observed as Record<string, unknown>).id, run.orderIds[0]);
  assert.equal((receipt.body.observed as Record<string, unknown>).status, "COMPLETED");
  assert.equal(receipt.body.resourcesUnchanged, true);
  assert.deepEqual((receipt.body.requests as { method: string }[]).map(item => item.method), ["POST", "GET"]);
  assert.equal((await store.run(run.id, session.id)).events.filter(event => event.kind === "resource_read").length, 1);
});

test("foreign runs, fabricated aliases and write tools are rejected before a provider read", async t => {
  const { store, session, run } = await setup(t);
  const foreign = await store.createSession("judge");
  await assert.rejects(ownedToolkitRead(store, foreign.id, run.id, run.orderIds[0]!));
  await assert.rejects(ownedToolkitRead(store, session.id, run.id, "FOREIGN-ORDER"), code("TOOLKIT_RESOURCE_DENIED"));
  const read = await ownedToolkitRead(store, session.id, run.id, run.orderIds[0]!);
  const before = (await store.run(run.id)).events.length;
  await assert.rejects(read.execute("capture_order", { id: read.wireOrderId }, "call_write"), code("TOOLKIT_ARGUMENTS_DENIED"));
  await assert.rejects(read.execute("get_order", { id: "ABCDEFGHIJKLMNOPQ" }, "call_foreign"), code("TOOLKIT_ARGUMENTS_DENIED"));
  await assert.rejects(read.execute("get_order", { id: read.wireOrderId, capture: true }, "call_extra"), code("TOOLKIT_ARGUMENTS_DENIED"));
  assert.equal((await store.run(run.id)).events.length, before);
});

test("Gemini continues the original saved interaction after an actual Toolkit read, without publishing thoughts", async t => {
  const { store, session, run, actionId } = await setup(t);
  const requests: Record<string, any>[] = [];
  const wire: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)); requests.push(body);
    if (requests.length === 1) return Response.json({ id: "interaction_original", model: "fixture-gemini", status: "requires_action", steps: [{ type: "thought", content: "private-thought-marker", signature: "opaque-signature-marker" }, { type: "function_call", id: "call_toolkit", name: "get_order", arguments: { id: JSON.parse(body.input[0].text).wireOrderId } }], usage: { total_input_tokens: 50 } });
    return Response.json({ id: "interaction_conclusion", model: "fixture-gemini", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({ conclusion: "The actual Sample order read reports completion. Reconcile this original purchase before any replacement.", observedOrderStatus: "COMPLETED", uncertainty: ["This controlled observation is not live provider evidence."] }), signature: "opaque-final-signature" }] }] });
  };
  const receipt = await modelToolkitReview(store, session.id, run, new GeminiInteractionModel(store, actionId, wire));
  assert.equal(requests.length, 2);
  assert.equal(requests[1]!.previous_interaction_id, "interaction_original");
  assert.equal(requests[1]!.input[0].type, "function_result");
  assert.equal(requests[1]!.input[0].call_id, "call_toolkit");
  assert.equal(JSON.parse(requests[1]!.input[0].result[0].text).observed.id, run.orderIds[0]);
  assert.equal(requests[1]!.tools[0].name, "get_order");
  assert.ok(requests[1]!.system_instruction.length > 20);
  assert.equal(receipt.body.noFinancialRequest, true);
  const published = JSON.stringify(await store.evidence(session.id));
  const contexts = await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_contexts");
  for (const marker of ["private-thought-marker", "opaque-signature-marker", "opaque-final-signature", "fixture-gemini-never-network"]) {
    assert.ok(!published.includes(marker)); assert.ok(!JSON.stringify(contexts.rows).includes(marker));
  }
});

test("Gemini's unknown create is retained across a fresh worker and a foreign continuation cannot dispatch", async t => {
  const { store, session, run, actionId } = await setup(t);
  let calls = 0;
  const wire: typeof fetch = async () => { calls++; throw new TypeError("Unknown provider outcome"); };
  const call: GeminiCall = { role: "unknown_gemini", model: "fixture-gemini", instructions: "Test bounded output", input: { source: "sample" } };
  await assert.rejects(new GeminiInteractionModel(store, actionId, wire).call(session.id, run.id, call), code("MODEL_TRANSPORT_FAILURE"));
  await assert.rejects(new GeminiInteractionModel(store, actionId, wire).call(session.id, run.id, call), code("MODEL_TRANSPORT_FAILURE"));
  await assert.rejects(new GeminiInteractionModel(store, actionId, wire).call(session.id, run.id, { ...call, role: "foreign_context", continuation: { attemptId: randomUUID(), results: [{ callId: "foreign", name: "get_order", output: {} }] } }), code("MODEL_CONTEXT_DENIED"));
  assert.equal(calls, 1);
});
