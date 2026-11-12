import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SqliteDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabStore } from "../packages/service/src/store";
import { modelRuntimeView } from "../packages/ai/src/runtime-view";

test("runtime projection is owned, bounded metadata and omits raw prompts, outputs and native error text", async t => {
  const directory = await mkdtemp(join(tmpdir(), "fracture-runtime-view-"));
  const db = new SqliteDatabase(join(directory, "state.sqlite")); await initializeDatabase(db);
  t.after(async () => { await db.close(); await rm(directory, { recursive: true, force: true }); });
  const store = new LabStore(db);
  const session = await store.createSession("judge"), foreign = await store.createSession("judge");
  const id = randomUUID();
  const privateMarker = "NEVER_PUBLISH_RAW_MODEL_CONTEXT";
  const document = { model: "gpt-6-astra", role: "diagnosis_conclusion", startedAt: "2026-11-12T10:00:00Z", durationMs: 3020, inputHash: "a".repeat(64), requestHash: "b".repeat(64), request: { input: privateMarker.repeat(50_000) }, response: { id: "resp_original", model: "gpt-6-astra", output: [{ type: "reasoning", encrypted_content: privateMarker }], usage: { input_tokens: 123, output_tokens: 41, unexpectedPrivate: privateMarker } }, context: { storage: "encrypted_server_only", retainedOutputItems: 3 }, transport: { endpoint: "https://api.openai.com/v1/responses", phase: "failed", httpStatus: 520, exception: { name: "TypeError", message: privateMarker, code: "UND_ERR_HEADERS_TIMEOUT" }, limits: { headersTimeoutMs: 900000, bodyTimeoutMs: 900000 } } };
  await db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,NULL,$3,'failed',$4)", [id, session.id, "diagnosis_conclusion", JSON.stringify(document)]);
  await db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,NULL,$3,'completed',$4)", [randomUUID(), foreign.id, "foreign_role", JSON.stringify({ ...document, model: "FOREIGN_MODEL" })]);
  const result = await modelRuntimeView(store, session.id);
  assert.equal(result.attempts.length, 1); assert.equal(result.totalAttempts, 1);
  assert.equal(result.attempts[0]?.id, id); assert.equal(result.attempts[0]?.inputTokens, 123);
  assert.equal(result.attempts[0]?.outputTokens, 41); assert.equal(result.attempts[0]?.privateContextStored, true);
  assert.deepEqual(result.attempts[0]?.transport?.nativeCodes, ["UND_ERR_HEADERS_TIMEOUT"]);
  assert.ok(!JSON.stringify(result).includes(privateMarker)); assert.ok(!JSON.stringify(result).includes("FOREIGN_MODEL"));
  assert.ok(JSON.stringify(result).length < 5000);
  await assert.rejects(modelRuntimeView(store, randomUUID()));
});

test("background recovery metadata uses the last actual transport and preserves the original response identity", async t => {
  const directory = await mkdtemp(join(tmpdir(), "fracture-runtime-background-view-"));
  const db = new SqliteDatabase(join(directory, "state.sqlite")); await initializeDatabase(db);
  t.after(async () => { await db.close(); await rm(directory, { recursive: true, force: true }); });
  const store = new LabStore(db), session = await store.createSession("judge"), id = randomUUID();
  await db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,NULL,$3,'completed',$4)", [id, session.id, "runtime_background_recovery", JSON.stringify({ model: "gpt-6.1-sol", responseId: "resp_saved", startedAt: "2026-11-12T10:00:00Z", transports: [{ endpoint: "https://api.openai.com/v1/responses", phase: "completed", httpStatus: 200 }, { endpoint: "https://api.openai.com/v1/responses/resp_saved", phase: "completed", httpStatus: 200 }], receipt: { evidenceId: id, durationMs: 12000, response: { id: "resp_saved", model: "gpt-6.1-sol", usage: { input_tokens: 13, output_tokens: 21 } } } })]);
  const result = (await modelRuntimeView(store, session.id)).attempts[0]!;
  assert.equal(result.responseId, "resp_saved"); assert.equal(result.background, true);
  assert.equal(result.transport?.endpoint, "https://api.openai.com/v1/responses/resp_saved");
  assert.equal(result.durationMs, 12000); assert.equal(result.inputTokens, 13);
  assert.equal(result.evidenceId, null);
});
