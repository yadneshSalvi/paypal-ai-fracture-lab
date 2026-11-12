import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PostgresDatabase, SqliteDatabase } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LabService, LabStore } from "../packages/service/src/index";
import { initializeDatabase } from "../packages/service/src/database";
import { workspaceRoot } from "../packages/service/src/config";
import { DeveloperAccess } from "../packages/developer-tools/src/access";
import { DeveloperRuntime } from "../packages/developer-tools/src/runtime";
import { checkLocalSourceChanges, importLocalSource, sourcePersistence } from "../packages/developer-tools/src/source-import";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { createSourceWorkspaceStore } from "../packages/source-workspaces/src/index";
import type { SourceWorkspaceStore } from "../packages/source-workspaces/src/types";
import type { SourceImportInput, SourceWorkspaceView } from "../packages/contracts/src/source-workspaces";

const sourceText = "export async function capturePurchase(intentId: string) { return fetch('/orders/' + intentId + '/capture', { method: 'POST' }); }\n";
const execute = promisify(execFile);
const adapters = process.env.DATABASE_URL ? ["sqlite", "postgres"] as const : ["sqlite"] as const;
const input = (): SourceImportInput => ({ rootId: "owned", path: "repo", title: "Private checkout", requestId: randomUUID() });

async function setup(t: TestContext, adapter: "sqlite" | "postgres") {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "fracture-source-access-")));
  const authorized = join(directory, "authorized");
  const repo = join(authorized, "repo");
  const storage = join(directory, "private");
  await mkdir(repo, { recursive: true, mode: 0o700 });
  await writeFile(join(repo, "checkout.ts"), sourceText);
  await writeFile(join(repo, "package.json"), JSON.stringify({ name: "controlled-source", private: true, scripts: { test: "node checkout.ts" } }));
  let db: SqlDatabase;
  let connectionUrl: string | undefined;
  let cleanup = async () => {};
  if (adapter === "postgres") {
    const url = new URL(process.env.DATABASE_URL!);
    assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Source qualification must use owned local PostgreSQL");
    const admin = new PostgresDatabase(url.href);
    const schema = "source_access_" + randomUUID().replaceAll("-", "");
    await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options", "-c search_path=" + schema);
    connectionUrl = url.href;
    db = new PostgresDatabase(connectionUrl);
    cleanup = async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.close(); };
  } else db = new SqliteDatabase(":memory:");
  await initializeDatabase(db);
  const lab = new LabStore(db);
  const service = new LabService(lab);
  const developer = new DeveloperAccess(service);
  const credentials = await developer.create();
  const owner = { sessionId: credentials.session.id, grantId: credentials.credential.id };
  let now = Date.now();
  const sources = new SourceAccessStore(lab, () => now);
  const local = await createSourceWorkspaceStore({ storageRoot: storage, allowedRoots: [{ id: "owned", directory: authorized }] });
  t.after(async () => { await db.close(); await cleanup(); await rm(directory, { recursive: true, force: true }); });
  return { db, lab, service, developer, credentials, owner, sources, local, directory, repo, storage, authorized, connectionUrl, advance: (milliseconds: number) => { now += milliseconds; } };
}

for (const adapter of adapters) {
  test(`${adapter}: accepted source survives mutable-tree edits and loss of the local cache`, async t => {
    const f = await setup(t, adapter);
    const request = input();
    const accepted = await importLocalSource(f.sources, f.owner, request, f.local);
    assert.equal(accepted.import.status, "ready");
    assert.equal(accepted.import.analysis, "static");
    assert.equal(accepted.snapshot?.graph.runtimeObserved, false);
    assert.equal(accepted.snapshot?.tools.commandsExecuted, 0);
    assert.equal(accepted.access.executeSource, false);
    const file = accepted.snapshot!.files.find(item => item.path === "checkout.ts")!;
    await writeFile(join(f.repo, "checkout.ts"), "export const changed = true;\n");
    assert.deepEqual(await importLocalSource(f.sources, f.owner, request, f.local), accepted);
    await rm(f.storage, { recursive: true });
    await rm(f.repo, { recursive: true });
    assert.equal((await f.sources.readFile(f.owner.sessionId, accepted.import.id, file.path, file.hash)).content, sourceText);
    const report = await f.sources.report(f.owner.sessionId, accepted.import.id);
    assert.equal(report.files.length, 2);
    assert.equal(report.execution.applicationCommands, 0);
    assert.equal(report.execution.paymentProviderCalls, 0);
    assert.match(report.contentHash, /^[a-f0-9]{64}$/);
    const metadata = JSON.stringify(await f.sources.get(f.owner.sessionId, accepted.import.id));
    assert.ok(!metadata.includes(f.directory));
    assert.ok(!metadata.includes(f.credentials.credential.secret));
    assert.ok(!metadata.includes(f.owner.grantId));
    assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
    assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  });

  test(`${adapter}: source import requires an owner grant before touching the filesystem`, async t => {
    const f = await setup(t, adapter);
    const judge = await f.lab.createSession();
    let imports = 0;
    const spy: SourceWorkspaceStore = { ...f.local, importSnapshot: async request => { imports++; return f.local.importSnapshot(request); } };
    await assert.rejects(importLocalSource(f.sources, { sessionId: judge.id, grantId: f.owner.grantId }, input(), spy), { code: "SOURCE_ACCESS_DENIED" });
    for (const path of ["/etc", "../private", "repo/../repo", "repo\\checkout.ts"]) await assert.rejects(importLocalSource(f.sources, f.owner, { ...input(), path }, spy), { code: "SOURCE_IMPORT_INPUT_INVALID" });
    assert.equal(imports, 0);
    assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
    await assert.rejects(importLocalSource(f.sources, f.owner, { ...input(), rootId: "unapproved" }, f.local), { code: "SOURCE_AUTHORITY_DENIED" });
    const retained = (await f.sources.list(f.owner.sessionId)).imports[0]!;
    assert.equal(retained.status, "rejected");
    assert.equal(retained.errorCode, "SOURCE_AUTHORITY_DENIED");
    assert.equal(retained.bytes, 0);
  });

  test(`${adapter}: browser approval exposes one exact import and cancellation withdraws it`, async t => {
    const f = await setup(t, adapter);
    const first = await importLocalSource(f.sources, f.owner, input(), f.local);
    const second = await importLocalSource(f.sources, f.owner, { ...input(), title: "Separate import" }, f.local);
    const browser = await f.lab.createSession();
    const stranger = await f.lab.createSession();
    const challenge = await f.sources.connect(browser.id, randomUUID());
    await assert.rejects(f.sources.get(browser.id, first.import.id), { code: "SOURCE_ACCESS_DENIED" });
    await assert.rejects(f.sources.connection(stranger.id, challenge.id), { code: "SOURCE_ACCESS_DENIED" });
    const other = await f.developer.create();
    const approval = { connectionId: challenge.id, importId: first.import.id, requestId: randomUUID() };
    await assert.rejects(f.sources.approve({ sessionId: other.session.id, grantId: other.credential.id }, approval), { code: "SOURCE_ACCESS_DENIED" });
    const granted = await f.sources.approve(f.owner, approval);
    assert.deepEqual(await f.sources.approve(f.owner, approval), granted);
    assert.equal(granted.scope, "one_source_snapshot_read_only");
    assert.equal((await f.sources.get(browser.id, first.import.id)).import.access, "approved_view");
    assert.deepEqual((await f.sources.list(browser.id)).imports.map(item => item.id), [first.import.id]);
    await assert.rejects(f.sources.get(browser.id, second.import.id), { code: "SOURCE_ACCESS_DENIED" });
    await assert.rejects(f.sources.approve(f.owner, { ...approval, importId: second.import.id }), { code: "SOURCE_APPROVAL_CONFLICT" });
    const file = first.snapshot!.files[0]!;
    assert.ok((await f.sources.readFile(browser.id, first.import.id, file.path, file.hash)).content);
    await f.sources.cancelConnection(browser.id, challenge.id);
    await assert.rejects(f.sources.readFile(browser.id, first.import.id, file.path, file.hash), { code: "SOURCE_ACCESS_DENIED" });
    await assert.rejects(f.sources.report(browser.id, first.import.id), { code: "SOURCE_ACCESS_DENIED" });
    assert.equal((await f.sources.list(browser.id)).imports.length, 0);
    assert.equal((await f.sources.get(f.owner.sessionId, first.import.id)).import.status, "ready");
  });

  test(`${adapter}: revocation stops every approved read and cannot be renewed through connection recovery`, async t => {
    const f = await setup(t, adapter);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    const browser = await f.lab.createSession();
    const requestId = randomUUID();
    const challenge = await f.sources.connect(browser.id, requestId);
    await f.sources.approve(f.owner, { connectionId: challenge.id, importId: accepted.import.id, requestId: randomUUID() });
    await f.developer.revoke(f.credentials.credential);
    assert.equal((await f.sources.connection(browser.id, challenge.id)).status, "expired");
    assert.equal((await f.sources.connect(browser.id, requestId)).approvalExpiresAt, challenge.approvalExpiresAt);
    for (const sessionId of [browser.id, f.owner.sessionId]) {
      await assert.rejects(f.sources.get(sessionId, accepted.import.id), { code: "SOURCE_ACCESS_DENIED" });
      await assert.rejects(f.sources.report(sessionId, accepted.import.id), { code: "SOURCE_ACCESS_DENIED" });
    }
    assert.equal((await f.db.query("SELECT path FROM lab_source_files")).rowCount, 2);
  });

  test(`${adapter}: concurrent imports preserve request identity and publish a single SQL snapshot`, async t => {
    const f = await setup(t, adapter);
    const request = input();
    const attempts = await Promise.allSettled([importLocalSource(f.sources, f.owner, request, f.local), importLocalSource(f.sources, f.owner, request, f.local)]);
    assert.ok(attempts.some(attempt => attempt.status === "fulfilled"));
    for (const attempt of attempts) if (attempt.status === "rejected") assert.equal((attempt.reason as { code: string }).code, "SOURCE_IMPORT_PENDING");
    const recovered = await importLocalSource(f.sources, f.owner, request, f.local);
    assert.equal(recovered.import.status, "ready");
    assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 1);
    assert.equal((await f.db.query("SELECT path FROM lab_source_files")).rowCount, 2);
    await assert.rejects(importLocalSource(f.sources, f.owner, { ...request, title: "Changed input" }, f.local), { code: "SOURCE_REQUEST_CONFLICT" });
    await writeFile(join(f.repo, "checkout.ts"), "export const different = true;\n");
    assert.equal((await importLocalSource(f.sources, f.owner, request, f.local)).snapshot!.manifestHash, recovered.snapshot!.manifestHash);
  });

  test(`${adapter}: a grant revoked during inspection cannot publish source or rewrite its receipt`, async t => {
    const f = await setup(t, adapter);
    const revokeAfterInspection: SourceWorkspaceStore = { ...f.local, importSnapshot: async request => {
      const snapshot = await f.local.importSnapshot(request);
      await f.developer.revoke(f.credentials.credential);
      return snapshot;
    } };
    await assert.rejects(importLocalSource(f.sources, f.owner, input(), revokeAfterInspection), { code: "SOURCE_ACCESS_DENIED" });
    const record = (await f.db.query("SELECT status,snapshot_document FROM lab_source_imports")).rows[0]!;
    assert.equal(record.status, "pending");
    assert.equal(record.snapshot_document, null);
    assert.equal((await f.db.query("SELECT path FROM lab_source_files")).rowCount, 0);
  });

  test(`${adapter}: immutable source and graph hashes detect stored-content tampering`, async t => {
    const f = await setup(t, adapter);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    const file = accepted.snapshot!.files.find(item => item.path === "checkout.ts")!;
    await assert.rejects(f.sources.readFile(f.owner.sessionId, accepted.import.id, file.path, "0".repeat(64)), { code: "SOURCE_HASH_MISMATCH" });
    await f.db.query("UPDATE lab_source_files SET content=$2 WHERE import_id=$1 AND path='checkout.ts'", [accepted.import.id, "unexpected replacement"]);
    await assert.rejects(f.sources.readFile(f.owner.sessionId, accepted.import.id, file.path, file.hash), { code: "SOURCE_INTEGRITY_FAILED" });
    await assert.rejects(f.sources.report(f.owner.sessionId, accepted.import.id), { code: "SOURCE_INTEGRITY_FAILED" });
    await f.db.query("UPDATE lab_source_imports SET snapshot_document=$2 WHERE id=$1", [accepted.import.id, JSON.stringify({ ...accepted.snapshot, totalBytes: 0 })]);
    await assert.rejects(f.sources.get(f.owner.sessionId, accepted.import.id), { code: "SOURCE_INTEGRITY_FAILED" });
  });

  test(`${adapter}: credential-shaped display metadata never reaches source storage or browser summaries`, async t => {
    const f = await setup(t, adapter);
    const marker = ["sk", "proj", "Q".repeat(28)].join("-");
    let reads = 0;
    const local = { ...f.local, importSnapshot: async (request: Parameters<SourceWorkspaceStore["importSnapshot"]>[0]) => { reads++; return f.local.importSnapshot(request); } };
    for (const field of ["rootId", "path", "title"] as const) {
      await assert.rejects(importLocalSource(f.sources, f.owner, { ...input(), [field]: marker }, local), { code: "SOURCE_IMPORT_INPUT_INVALID" });
    }
    assert.equal(reads, 0);
    assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    await f.db.query("UPDATE lab_source_imports SET title=$2 WHERE id=$1", [accepted.import.id, marker]);
    await assert.rejects(f.sources.list(f.owner.sessionId), { code: "SOURCE_INTEGRITY_FAILED" });
    await assert.rejects(f.sources.get(f.owner.sessionId, accepted.import.id), { code: "SOURCE_INTEGRITY_FAILED" });
    await assert.rejects(f.sources.report(f.owner.sessionId, accepted.import.id), { code: "SOURCE_INTEGRITY_FAILED" });
  });

  test(`${adapter}: change observations retain their original bytes and interrupted identity`, async t => {
    const f = await setup(t, adapter);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    await writeFile(join(f.repo, "checkout.ts"), "export const revision = 2;\n");
    const request = randomUUID();
    const first = await checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, request, f.local);
    assert.equal(first.unchanged, false);
    assert.deepEqual(first.changes.map(item => [item.path, item.kind]), [["checkout.ts", "modified"]]);
    await writeFile(join(f.repo, "checkout.ts"), "export const revision = 3;\n");
    assert.deepEqual(await checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, request, f.local), first);
    const failedRequest = randomUUID();
    const interrupted = { ...f.local, checkChanges: async () => { throw new Error("controlled observation interruption"); } };
    await assert.rejects(checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, failedRequest, interrupted), { code: "SOURCE_IMPORT_INTERRUPTED" });
    await assert.rejects(checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, failedRequest, f.local), { code: "SOURCE_CHANGE_PENDING" });
    const retained = (await f.db.query("SELECT status,error_code FROM lab_source_changes WHERE request_id=$1", [failedRequest])).rows[0]!;
    assert.equal(retained.status, "interrupted");
    assert.equal(retained.error_code, "SOURCE_IMPORT_INTERRUPTED");
    const visible = await f.sources.get(f.owner.sessionId, accepted.import.id);
    assert.ok(visible.changeChecks.some(check => check.requestId === failedRequest && check.status === "interrupted" && check.errorCode === "SOURCE_IMPORT_INTERRUPTED" && check.receipt === null));
    assert.equal(visible.latestChanges!.receiptHash, first.receiptHash);
    const next = await checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, randomUUID(), f.local);
    assert.notEqual(first.currentRevisionHash, next.currentRevisionHash);
    assert.equal((await f.sources.get(f.owner.sessionId, accepted.import.id)).snapshot!.manifestHash, accepted.snapshot!.manifestHash);
  });

  test(`${adapter}: fixed deadlines and reserved source capacity cannot be renewed by retries`, async t => {
    const f = await setup(t, adapter);
    const browser = await f.lab.createSession();
    const requestId = randomUUID();
    const challenge = await f.sources.connect(browser.id, requestId);
    f.advance(5 * 60_000 + 1);
    const expired = await f.sources.connect(browser.id, requestId);
    assert.equal(expired.id, challenge.id);
    assert.equal(expired.approvalExpiresAt, challenge.approvalExpiresAt);
    assert.equal(expired.status, "expired");
    for (let index = 0; index < 4; index++) await f.sources.reserveImport(f.owner, input());
    await assert.rejects(f.sources.reserveImport(f.owner, input()), { code: "SOURCE_IMPORT_LIMIT" });
    const acceptedRequest = input();
    const g = await setup(t, adapter);
    await g.sources.reserveImport(g.owner, acceptedRequest);
    g.advance(24 * 3600_000 + 1);
    await assert.rejects(g.sources.reserveImport(g.owner, acceptedRequest), { code: "SOURCE_ACCESS_DENIED" });
  });

  test(`${adapter}: the observation limit retains every original check and still recovers a completed request`, async t => {
    const f = await setup(t, adapter);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    const originalRequest = randomUUID();
    const original = await checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, originalRequest, f.local);
    for (let index = 1; index < 20; index++) {
      const claim = await f.sources.beginChanges(f.owner, accepted.import.id, randomUUID());
      if (index % 2) await f.sources.retainChangeFailure(f.owner, claim.id, "SOURCE_IMPORT_INTERRUPTED");
    }
    let reads = 0;
    const local = { ...f.local, checkChanges: async (request: Parameters<SourceWorkspaceStore["checkChanges"]>[0]) => { reads++; return f.local.checkChanges(request); } };
    await assert.rejects(checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, randomUUID(), local), { code: "SOURCE_CHANGE_LIMIT" });
    assert.deepEqual(await checkLocalSourceChanges(f.sources, f.owner, accepted.import.id, originalRequest, local), original);
    assert.equal(reads, 0);
    const visible = await f.sources.get(f.owner.sessionId, accepted.import.id);
    assert.equal(visible.changeChecks.length, 20);
    assert.equal(visible.changeChecks.filter(check => check.status === "ready").length, 1);
    assert.equal(visible.changeChecks.filter(check => check.status === "interrupted").length, 10);
    assert.equal(visible.latestChanges!.receiptHash, original.receiptHash);
  });

  test(`${adapter}: source summaries never transfer full source graphs or file contents`, async t => {
    const f = await setup(t, adapter);
    const accepted = await importLocalSource(f.sources, f.owner, input(), f.local);
    let selected = "";
    const original = f.db.transaction.bind(f.db);
    f.db.transaction = work => original(async tx => {
      const query = tx.query.bind(tx);
      tx.query = async <T extends Record<string, unknown>>(sql: string, parameters: unknown[] = []) => {
        if (sql.includes("FROM lab_source_imports WHERE session_id=")) selected = sql;
        return query<T>(sql, parameters);
      };
      return work(tx);
    });
    const index = await f.sources.list(f.owner.sessionId);
    assert.equal(index.imports[0]!.revisionHash, accepted.snapshot!.revisionHash);
    assert.match(selected, /^SELECT id,session_id/);
    assert.ok(!selected.includes("snapshot_document"));
    assert.ok(!JSON.stringify(index).includes(sourceText));
    assert.ok(Buffer.byteLength(JSON.stringify(index)) < 4096);
  });
}

test("strict developer source schemas reject caller-selected storage, execution and authority fields", async t => {
  const f = await setup(t, "sqlite");
  const runtime = new DeveloperRuntime(f.service, f.credentials.credential);
  for (const extra of [{ storageRoot: "/private" }, { execute: true }, { grantId: f.owner.grantId }, { pythonExecutable: "/bin/sh" }, { mode: "live_sandbox" }]) await assert.rejects(runtime.call("import_source_workspace", { ...input(), ...extra }), { code: "INVALID_TOOL_INPUT" });
  assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
});

test("remote source persistence needs explicit trusted-host opt-in before claiming an import", async t => {
  const f = await setup(t, "sqlite");
  const priorUrl = process.env.DATABASE_URL;
  const priorOptIn = process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE;
  process.env.DATABASE_URL = "postgresql://operator@private-database.invalid/source";
  delete process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE;
  try {
    assert.deepEqual(sourcePersistence(), { target: "remote_or_unconfigured_database", allowed: false, copiesSanitizedSource: true });
    await assert.rejects(importLocalSource(f.sources, f.owner, input()), { code: "SOURCE_REMOTE_STORAGE_GATE" });
    assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
    process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE = "1";
    assert.equal(sourcePersistence().allowed, true);
    assert.ok(!JSON.stringify(sourcePersistence()).includes("private-database.invalid"));
  } finally {
    if (priorUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = priorUrl;
    if (priorOptIn === undefined) delete process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE; else process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE = priorOptIn;
  }
});

test("fresh CLI import, stdio MCP read, explicit browser approval and revocation share durable scope", { skip: !process.env.DATABASE_URL }, async t => {
  const f = await setup(t, "postgres");
  const root = workspaceRoot();
  const credentialFile = join(f.directory, "process-session.json");
  const env = { NODE_ENV: "test" as const, PATH: process.env.PATH!, DATABASE_URL: f.connectionUrl!, FRACTURE_WORKSPACE_ROOT: root, FRACTURE_DEVELOPER_CREDENTIAL_FILE: credentialFile, FRACTURE_SOURCE_ROOTS: JSON.stringify([{ id: "owned", directory: f.authorized }]), OPENAI_PLANNER_MODEL: "gpt-6-astra", OPENAI_REASONING_EFFORT: "max" };
  const cli = async (...args: string[]) => JSON.parse((await execute(process.execPath, ["--import", "tsx", "apps/cli/src/index.ts", ...args], { cwd: root, env, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 })).stdout);
  const initialized = await cli("init");
  const request = input();
  const imported = await cli("call", "import_source_workspace", JSON.stringify(request)) as SourceWorkspaceView;
  assert.equal(imported.import.status, "ready");
  assert.equal((await cli("call", "import_source_workspace", JSON.stringify(request))).import.id, imported.import.id);
  const client = new Client({ name: "fracture-source-stdio", version: "1.0" });
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "apps/mcp/src/index.ts"], cwd: root, env, stderr: "pipe" });
  let stderr = "";
  transport.stderr?.on("data", chunk => { stderr += chunk; });
  t.after(async () => { await client.close(); });
  await client.connect(transport);
  const file = imported.snapshot!.files.find(item => item.path === "checkout.ts")!;
  const response = await client.callTool({ name: "read_source_file", arguments: { importId: imported.import.id, path: file.path, expectedHash: file.hash } });
  assert.notEqual(response.isError, true);
  assert.equal(JSON.parse((response.content as { text: string }[])[0]!.text).content, sourceText);
  const browser = await f.lab.createSession();
  const challenge = await f.sources.connect(browser.id, randomUUID());
  const approved = await cli("call", "approve_source_view", JSON.stringify({ connectionId: challenge.id, importId: imported.import.id, requestId: randomUUID() }));
  assert.equal(approved.confirmationLabel, challenge.confirmationLabel);
  assert.equal((await f.sources.get(browser.id, imported.import.id)).import.id, imported.import.id);
  assert.equal((await f.sources.get(initialized.sessionId, imported.import.id)).snapshot!.manifestHash, imported.snapshot!.manifestHash);
  await cli("revoke");
  await assert.rejects(f.sources.report(browser.id, imported.import.id), { code: "SOURCE_ACCESS_DENIED" });
  assert.equal((await client.callTool({ name: "get_source_workspace", arguments: { importId: imported.import.id } })).isError, true);
  await client.close();
  assert.equal(stderr, "");
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
});
