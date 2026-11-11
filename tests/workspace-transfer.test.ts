import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PostgresDatabase, SqliteDatabase } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService, LabStore } from "../packages/service/src/index";
import { hasExecutingWorkspaceWork } from "../apps/web/lib/workspace-polling";

const adapters = (process.env.DATABASE_URL ? ["sqlite", "postgres"] : ["sqlite"]) as ("sqlite" | "postgres")[];
async function database(t: TestContext, adapter: "sqlite" | "postgres") {
  let db: SqlDatabase;
  let cleanup = async () => {};
  if (adapter === "postgres") {
    const url = new URL(process.env.DATABASE_URL!);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Transfer regression must use local PostgreSQL");
    const admin = new PostgresDatabase(url.href);
    const schema = `workspace_transfer_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options", `-c search_path=${schema}`);
    db = new PostgresDatabase(url.href);
    cleanup = async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.close(); };
  } else db = new SqliteDatabase(":memory:");
  t.after(async () => { await db.close(); await cleanup(); });
  await initializeDatabase(db);
  return db;
}

for (const adapter of adapters) {
  test(`${adapter}: workspace progress transfers metadata while retaining complete model evidence`, async t => {
    const db = await database(t, adapter);
    const store = new LabStore(db);
    const service = new LabService(store);
    const session = await store.createSession();
    const foreign = await store.createSession();
    const runId = randomUUID();
    const actionId = randomUUID();
    const start = "2026-11-11T12:00:00.000Z";
    await db.query("INSERT INTO lab_actions(id,session_id,run_id,action,input_hash,stage,created_at) VALUES($1,$2,$3,'generate','fixture','running',$4)", [actionId, session.id, runId, start]);
    const retained: { id: string; document: string }[] = [];
    for (const [owner, role, startedAt] of [
      [session.id, "diagnosis_conclusion", "2026-11-11T11:59:00.000Z"],
      [session.id, "repair_contract_plan", "2026-11-11T12:01:00.000Z"],
      [session.id, "repair_candidate_source", "2026-11-11T12:02:00.000Z"],
      [foreign.id, "diagnosis_conclusion", "2026-11-11T12:03:00.000Z"],
    ]) {
      const id = randomUUID();
      const document = JSON.stringify({ startedAt, request: { input: "retained-fixture-context ".repeat(25_000) }, source: "sample" });
      retained.push({ id, document });
      await db.query("INSERT INTO lab_model_attempts(id,session_id,run_id,role,status,document) VALUES($1,$2,$3,$4,'running',$5)", [id, owner, runId, role, document]);
    }
    let transferredRows: unknown[] = [];
    const originalQuery = db.query.bind(db);
    db.query = async <T extends Record<string, unknown>>(sql: string, params: unknown[] = []) => {
      const result = await originalQuery<T>(sql, params);
      if (sql.includes("FROM lab_model_attempts")) transferredRows = result.rows;
      return result;
    };
    const workspace = await service.workspace(session);
    assert.equal(workspace.work.length, 1);
    assert.equal(workspace.work[0]?.phase, "Astra is authoring a grounded candidate");
    assert.equal(workspace.work[0]?.status, "running");
    assert.equal(transferredRows.length, 3);
    const transferBytes = Buffer.byteLength(JSON.stringify(transferredRows));
    assert.ok(transferBytes < 1024, `Expected bounded metadata, got ${transferBytes} bytes`);
    assert.ok(!JSON.stringify(transferredRows).includes("retained-fixture-context"));
    for (const original of retained) {
      const result = await originalQuery<{ document: string }>("SELECT document FROM lab_model_attempts WHERE id=$1", [original.id]);
      assert.equal(result.rows[0]?.document, original.document);
    }
    await db.query("UPDATE lab_actions SET stage='completed' WHERE id=$1", [actionId]);
    assert.equal((await service.workspace(session)).work[0]?.phase, "completed");
  });
}

test("a customer approval wait is idle while executing runs still request progress", () => {
  assert.equal(hasExecutingWorkspaceWork({ runs: [{ stage: "awaiting_approval" }], campaigns: [], work: [] }, null), false);
  assert.equal(hasExecutingWorkspaceWork({ runs: [{ stage: "completed" }, { stage: "inconclusive" }], campaigns: [], work: [] }, null), false);
  assert.equal(hasExecutingWorkspaceWork({ runs: [{ stage: "executing" }], campaigns: [], work: [] }, null), true);
});

test("a repair or campaign remains observable even when its purchase is awaiting approval", () => {
  const runs = [{ stage: "awaiting_approval" as const }];
  assert.equal(hasExecutingWorkspaceWork({ runs, campaigns: [], work: [{ status: "running" }] }, null), true);
  assert.equal(hasExecutingWorkspaceWork({ runs, campaigns: [{ status: "running" }], work: [] }, null), true);
  assert.equal(hasExecutingWorkspaceWork({ runs, campaigns: [], work: [] }, "advance"), true);
  assert.equal(hasExecutingWorkspaceWork(null, null), false);
});
