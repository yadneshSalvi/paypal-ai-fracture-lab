import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SqliteDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService, LabStore, LabError } from "../packages/service/src/index";
import { OpenAIModel } from "../packages/ai/src/model";
import type { ModelCall, ModelResponse } from "../packages/ai/src/model";
import { createModelTransport } from "../packages/ai/src/transport";
import { modelDiagnosis } from "../packages/ai/src/diagnosis";

process.env.JUDGE_SESSION_SECRET ??= "fixture-context-encryption-only";
process.env.OPENAI_PLANNER_MODEL ??= "fixture-model";
process.env.OPENAI_API_KEY ??= "fixture-provider-key-no-network";

async function setup(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "fracture-context-"));
  const db = new SqliteDatabase(join(directory, "db.sqlite"));
  await initializeDatabase(db);
  const store = new LabStore(db);
  const service = new LabService(store);
  const session = await store.createSession("owner");
  const run = await service.startRun(session.id, { projectId: "bramble", scenarioId: "S0", revision: "faulty", mode: "sample", seed: "context-v2-fixture", requestId: randomUUID(), interactive: false });
  const actionId = randomUUID();
  await store.claimAction(session.id, run.id, actionId, "diagnose", {});
  t.after(async () => { await db.close(); await rm(directory, { recursive: true, force: true }); });
  return { db, store, service, session, run, actionId };
}

const first: ModelCall = { role: "tool_selection", model: "fixture-model", instructions: "Choose the only scoped read.", input: { original: "initial data survives" }, toolName: "read_owned_order", tools: [{ type: "function", name: "read_owned_order", parameters: { type: "object", properties: {}, additionalProperties: false } }] };
const rawOutput = [
  { type: "reasoning", id: "rs_fixture", summary: [], encrypted_content: "opaque-reasoning-fixture-never-publish" },
  { type: "message", id: "msg_fixture", role: "assistant", status: "completed", content: [{ type: "output_text", text: "The original order is the next read.", annotations: [] }] },
  { type: "function_call", id: "fc_fixture", name: "read_owned_order", arguments: "{}", call_id: "call_original", status: "completed" },
];
const toolResponse: ModelResponse = { id: "resp_original", model: "fixture-model", status: "completed", output: rawOutput };
const finalResponse: ModelResponse = { id: "resp_final", model: "fixture-model", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: '{"result":"read retained"}' }] }] };
const code = (expected: string) => (error: unknown) => error instanceof LabError && error.code === expected;

test("a fresh worker continues with original inputs and every opaque output item in exact order", async t => {
  const { store, session, run, actionId } = await setup(t);
  const requests: Record<string, unknown>[] = [];
  const wire: typeof fetch = async (_url, init) => { const request = JSON.parse(String(init?.body)); requests.push(request); return Response.json(requests.length === 1 ? toolResponse : finalResponse); };
  const selected = await new OpenAIModel(store, wire, actionId).call(session.id, run.id, first);
  const continuation: ModelCall = { role: "conclusion", model: "fixture-model", instructions: "Conclude from this actual receipt.", input: { source: "sample" }, continuation: { attemptId: selected.attemptId, toolOutputs: [{ callId: "call_original", output: { orderId: "owned", status: "COMPLETED" } }] } };
  const finished = await new OpenAIModel(store, wire, actionId).call(session.id, run.id, continuation);
  assert.equal(requests.length, 2);
  const expectedPrefix = [...requests[0]!.input as unknown[], ...rawOutput, { type: "function_call_output", call_id: "call_original", output: '{"orderId":"owned","status":"COMPLETED"}' }];
  assert.deepEqual((requests[1]!.input as unknown[]).slice(0, expectedPrefix.length), expectedPrefix);
  assert.equal(requests[1]!.store, false);
  assert.deepEqual(requests[1]!.include, ["reasoning.encrypted_content"]);
  assert.equal(finished.response.output.length, 1);
  assert.ok(!JSON.stringify(selected).includes("opaque-reasoning-fixture"));
  const publicRows = await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_attempts");
  const privateRows = await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_contexts");
  const allStored = JSON.stringify([...publicRows.rows, ...privateRows.rows, ...await store.evidence(session.id)]);
  assert.ok(!allStored.includes("opaque-reasoning-fixture"));
  assert.ok(!allStored.includes("initial data survives"));
  assert.ok(!allStored.includes(process.env.OPENAI_API_KEY!));
  assert.equal(JSON.parse(privateRows.rows[0]!.document).algorithm, "aes-256-gcm");
});

test("continuations refuse foreign sessions, other runs, changed models and mismatched tool identities before dispatch", async t => {
  const { store, session, run, actionId } = await setup(t);
  let sends = 0;
  const wire: typeof fetch = async () => { sends++; return Response.json(toolResponse); };
  const selected = await new OpenAIModel(store, wire, actionId).call(session.id, run.id, first);
  const base: ModelCall = { role: "conclusion", model: "fixture-model", instructions: "Conclude.", input: {}, continuation: { attemptId: selected.attemptId, toolOutputs: [{ callId: "call_original", output: {} }] } };
  await assert.rejects(new OpenAIModel(store, wire).call("foreign-session", run.id, base), code("MODEL_CONTEXT_DENIED"));
  await assert.rejects(new OpenAIModel(store, wire).call(session.id, "other-run", base), code("MODEL_CONTEXT_DENIED"));
  await assert.rejects(new OpenAIModel(store, wire).call(session.id, run.id, { ...base, model: "other-model" }), code("MODEL_CONTEXT_CONFLICT"));
  for (const toolOutputs of [[], [{ callId: "foreign-call", output: {} }], [{ callId: "call_original", output: {} }, { callId: "call_original", output: {} }]]) {
    await assert.rejects(new OpenAIModel(store, wire).call(session.id, run.id, { ...base, continuation: { attemptId: selected.attemptId, toolOutputs } }), code("MODEL_TOOL_CONTINUATION"));
  }
  assert.equal(sends, 1);
  assert.equal((await store.db.query("SELECT id FROM lab_model_attempts")).rowCount, 1);
});

test("an altered encrypted context cannot be used or silently replaced", async t => {
  const { store, session, run, actionId } = await setup(t);
  let sends = 0;
  const wire: typeof fetch = async () => { sends++; return Response.json(toolResponse); };
  const selected = await new OpenAIModel(store, wire, actionId).call(session.id, run.id, first);
  const row = (await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_contexts WHERE id=$1", [selected.attemptId])).rows[0]!;
  const envelope = JSON.parse(row.document); envelope.ciphertext = (envelope.ciphertext[0] === "A" ? "B" : "A") + envelope.ciphertext.slice(1);
  await store.db.query("UPDATE lab_model_contexts SET document=$2 WHERE id=$1", [selected.attemptId, JSON.stringify(envelope)]);
  await assert.rejects(new OpenAIModel(store, wire).call(session.id, run.id, { ...first, role: "conclusion", continuation: { attemptId: selected.attemptId, toolOutputs: [{ callId: "call_original", output: {} }] } }), code("MODEL_CONTEXT_UNREADABLE"));
  assert.equal(sends, 1);
  assert.equal((await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_contexts WHERE id=$1", [selected.attemptId])).rows[0]!.document, JSON.stringify(envelope));
});

test("concurrent and restarted workers preserve one foreground dispatch and one completed receipt", async t => {
  const { store, session, run, actionId } = await setup(t);
  let sends = 0; let release!: () => void; let notify!: () => void;
  const begun = new Promise<void>(resolve => { notify = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const wire: typeof fetch = async () => { sends++; notify(); await gate; return Response.json(finalResponse); };
  const pending = new OpenAIModel(store, wire, actionId).call(session.id, run.id, first);
  await begun;
  await assert.rejects(new OpenAIModel(store, wire, actionId).call(session.id, run.id, first), code("MODEL_DISPATCH_UNKNOWN"));
  release(); const original = await pending;
  const resumed = await new OpenAIModel(store, wire, actionId).call(session.id, run.id, first);
  assert.deepEqual(resumed, original);
  assert.equal(sends, 1);
  assert.equal((await store.evidence(session.id)).filter(item => item.id === original.evidenceId).length, 1);
  await assert.rejects(new OpenAIModel(store, wire, actionId).call(session.id, run.id, { ...first, input: { changed: true } }), code("MODEL_CHECKPOINT_CONFLICT"));
});

test("an unknown foreground outcome retains its native timeout cause and cannot be dispatched by a new worker", async t => {
  const { store, session, run, actionId } = await setup(t);
  let sends = 0;
  const transport = createModelTransport({ fetchImpl: async () => { sends++; throw new TypeError("fixture-secret-message", { cause: Object.assign(new Error("private-cause"), { code: "UND_ERR_HEADERS_TIMEOUT" }) }); } });
  await assert.rejects(new OpenAIModel(store, transport, actionId).call(session.id, run.id, first), code("MODEL_TRANSPORT_UNKNOWN"));
  await assert.rejects(new OpenAIModel(store, transport, actionId).call(session.id, run.id, first), code("MODEL_TRANSPORT_UNKNOWN"));
  assert.equal(sends, 1);
  const row = (await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_attempts WHERE run_id=$1", [run.id])).rows[0]!;
  const saved = JSON.parse(row.document);
  assert.equal(saved.transport.exception.cause.code, "UND_ERR_HEADERS_TIMEOUT");
  assert.equal(saved.transport.automaticRetries, 0);
  assert.ok(!row.document.includes("fixture-secret-message"));
  assert.ok(!row.document.includes("private-cause"));
});

test("a non-JSON 520 is a retained HTTP failure, distinct from a parser failure", async t => {
  const { store, session, run, actionId } = await setup(t);
  let sends = 0;
  const transport = createModelTransport({ fetchImpl: async () => { sends++; return new Response("<html>private gateway body</html>", { status: 520, headers: { "content-type": "text/html", "x-request-id": "fixture-gateway-id" } }); } });
  await assert.rejects(new OpenAIModel(store, transport, actionId).call(session.id, run.id, first), code("MODEL_HTTP_520"));
  const row = (await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_model_attempts WHERE run_id=$1", [run.id])).rows[0]!;
  const saved = JSON.parse(row.document);
  assert.equal(sends, 1);
  assert.equal(saved.transport.httpStatus, 520);
  assert.equal(saved.transport.contentType, "text/html");
  assert.match(saved.transport.responseSha256, /^[a-f0-9]{64}$/);
  assert.ok(!row.document.includes("private gateway body"));
});

test("product diagnosis sends the actual pinned SDK read back as a matched model tool result without changing money", async t => {
  const { store, session, run, actionId } = await setup(t);
  const resourcesBefore = await store.resources(run.id);
  const requests: Array<{ input: unknown[]; tools?: unknown[] }> = [];
  const wire: typeof fetch = async (_url, init) => {
    const request = JSON.parse(String(init?.body)); requests.push(request);
    if (requests.length === 1) return Response.json({ ...toolResponse, output: [rawOutput[0], { type: "function_call", name: "read_owned_order", call_id: "call_original", arguments: JSON.stringify({ orderId: run.orderIds[0], hypotheses: [{ id: "unpaid", title: "No payment", reason: "A read is needed." }, { id: "paid", title: "Completed payment", reason: "Read the original resource." }] }) }] });
    return Response.json({ ...finalResponse, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ hypotheses: [{ id: "unpaid", title: "No payment", status: "eliminated", reason: "The original order has a completed capture." }, { id: "paid", title: "Completed payment", status: "supported", reason: "The run-owned SDK read returned the capture." }], conclusion: "The controlled Sample purchase is paid." }) }] }] });
  };
  const diagnosis = await modelDiagnosis(store, session.id, run, new OpenAIModel(store, wire, actionId));
  assert.equal(diagnosis.status, "tested");
  assert.equal(diagnosis.experiment.tool, "APIMatic PaypalClient.orders.getOrder");
  const result = requests[1]!.input.find(item => (item as { type?: string }).type === "function_call_output") as { call_id: string; output: string };
  const read = JSON.parse(result.output);
  assert.equal(result.call_id, "call_original");
  assert.equal(read.integration.package, "paypal");
  assert.equal(read.integration.version, "2.29.0");
  assert.equal(read.integration.endpoint, "GET /v2/checkout/orders/{id}");
  assert.equal(read.orderId, run.orderIds[0]);
  assert.equal(read.resources.find((item: { kind: string }) => item.kind === "order").status, "COMPLETED");
  assert.deepEqual(await store.resources(run.id), resourcesBefore);
  assert.equal(requests.length, 2);
});
