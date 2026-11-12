import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat, chmod, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PostgresDatabase, SqliteDatabase, type SqlDatabase } from "@fracture/paypal-core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LabService, LabStore } from "../packages/service/src/index";
import { initializeDatabase } from "../packages/service/src/database";
import { workspaceRoot } from "../packages/service/src/config";
import { DeveloperAccess, initializeCredential, readCredential } from "../packages/developer-tools/src/access";
import { DeveloperRuntime, safeDeveloperError, toolDefinitions } from "../packages/developer-tools/src/runtime";
import { createDeveloperMcp } from "../apps/mcp/src/server";
import type { RunDTO } from "../packages/contracts/src/index";
import type { CampaignLabDTO } from "../packages/contracts/src/campaign-lab";
import { CampaignLab } from "../packages/campaigns/src/runtime";

const execute = promisify(execFile);
const adapters = process.env.DATABASE_URL ? ["sqlite", "postgres"] as const : ["sqlite"] as const;
async function setup(t: TestContext, adapter: "sqlite" | "postgres") {
  const directory = await mkdtemp(join(tmpdir(), "fracture-developer-"));
  let db: SqlDatabase;
  let connectionUrl: string | undefined;
  let cleanup = async () => {};
  if (adapter === "postgres") {
    const admin = new PostgresDatabase(process.env.DATABASE_URL!);
    const schema = `dev_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(process.env.DATABASE_URL!); url.searchParams.set("options", `-c search_path=${schema}`); connectionUrl = url.toString();
    db = new PostgresDatabase(connectionUrl);
    cleanup = async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.close(); };
  } else db = new SqliteDatabase(join(directory, "test.sqlite"));
  await initializeDatabase(db);
  const service = new LabService(new LabStore(db));
  const access = new DeveloperAccess(service); await access.initialize();
  const created = await access.create();
  const runtime = new DeveloperRuntime(service, created.credential);
  t.after(async () => { await db.close(); await cleanup(); await rm(directory, { recursive: true, force: true }); });
  return { db, service, access, runtime, directory, connectionUrl, ...created };
}
const input = () => ({ scenarioId: "S0", revision: "hardened", seed: "same-seed-01", requestId: randomUUID() });

for (const adapter of adapters) {
  test(`${adapter}: developer calls persist actual experiment evidence and bind command identity`, async t => {
    const { runtime, service, session } = await setup(t, adapter);
    const args = input();
    const run = await runtime.call("run_curated_scenario", args) as RunDTO;
    assert.equal(run.source, "sample"); assert.equal(run.verdict, "pass"); assert.equal(run.captureCount, 1);
    assert.equal((await runtime.call("run_curated_scenario", args) as RunDTO).id, run.id);
    await assert.rejects(runtime.call("run_curated_scenario", { ...args, revision: "faulty" }), { code: "RUN_PAYLOAD_CONFLICT" });
    const report = await runtime.call("export_report", { runId: run.id }) as { run: RunDTO; evidence: unknown[] };
    assert.equal(report.run.id, run.id); assert.ok(report.evidence.length > 10);
    assert.equal((await service.store.runs(session.id)).length, 1);
  });
  test(`${adapter}: an independent developer grant cannot read or diagnose another session's run`, async t => {
    const { runtime, access, service } = await setup(t, adapter);
    const run = await runtime.call("run_curated_scenario", input()) as RunDTO;
    const stranger = new DeveloperRuntime(service, (await access.create()).credential);
    for (const tool of ["get_run", "export_report"]) await assert.rejects(stranger.call(tool, { runId: run.id }), { code: "RUN_NOT_FOUND" });
    await assert.rejects(stranger.call("diagnose_run", { runId: run.id, requestId: randomUUID() }), { code: "RUN_NOT_FOUND" });
    assert.equal((await service.store.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
  });
  test(`${adapter}: expired, revoked, forged and stale owner grants fail closed`, async t => {
    const { runtime, access, credential, service, session } = await setup(t, adapter);
    await assert.rejects(access.authorize({ ...credential, secret: "a".repeat(64) }), { code: "DEVELOPER_ACCESS_DENIED" });
    await service.store.db.query("UPDATE lab_sessions SET expires_at=$2 WHERE id=$1", [session.id, "2000-01-01T00:00:00.000Z"]);
    await assert.rejects(runtime.call("list_experiments", {}), { code: "DEVELOPER_ACCESS_DENIED" });
    const another = await access.create();
    await access.revoke(another.credential);
    await assert.rejects(access.authorize(another.credential), { code: "DEVELOPER_ACCESS_DENIED" });
    const expired = await access.create();
    await service.store.db.query("UPDATE lab_developer_grants SET expires_at=$2 WHERE id=$1", [expired.credential.id, "2000-01-01T00:00:00.000Z"]);
    await assert.rejects(access.authorize(expired.credential), { code: "DEVELOPER_ACCESS_DENIED" });
    const stored = await service.store.db.query<{ secret_hash: string } & Record<string, unknown>>("SELECT secret_hash FROM lab_developer_grants WHERE id=$1", [credential.id]);
    assert.notEqual(stored.rows[0]?.secret_hash, credential.secret);
  });
  test(`${adapter}: no tool accepts live mode, arbitrary paths, financial parameters, or gated scenarios`, async t => {
    const { runtime, service } = await setup(t, adapter);
    for (const extra of [{ mode: "live_sandbox" }, { path: "/etc/passwd" }, { payee: "other" }, { amount: 1 }, { projectId: "other" }]) await assert.rejects(runtime.call("run_curated_scenario", { ...input(), ...extra }), { code: "INVALID_TOOL_INPUT" });
    for (const scenarioId of ["L1", "S8", "N1"]) await assert.rejects(runtime.call("run_curated_scenario", { ...input(), scenarioId }), { code: "SCENARIO_GATED" });
    for (const tool of ["capture_payment", "run_local_scenario", "__proto__"]) await assert.rejects(runtime.call(tool, {}), { code: "TOOL_NOT_AVAILABLE" });
    assert.equal((await service.store.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  });
  test(`${adapter}: proposals are read-only and rate limits bound execution`, async t => {
    const { runtime, service, credential } = await setup(t, adapter);
    const proposal = await runtime.call("propose_scenario", { scenarioId: "S0", revision: "faulty" }) as { executable: boolean };
    assert.equal(proposal.executable, true); assert.equal((await service.store.db.query("SELECT id FROM lab_runs")).rowCount, 0);
    const key = `developer:${credential.id}:run`;
    await service.store.db.query("INSERT INTO lab_rate_windows(key,window_key,count) VALUES($1,$2,20)", [key, String(Math.floor(Date.now() / 3600000))]);
    await assert.rejects(runtime.call("run_curated_scenario", input()), { code: "RATE_LIMIT" });
    assert.equal((await service.store.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  });
}

test("private credential initialization is idempotent and rejects symlinks and broad file permissions", async t => {
  const { access, directory } = await setup(t, "sqlite");
  const path = join(directory, "session.json");
  const first = await initializeCredential(access, path); const second = await initializeCredential(access, path);
  assert.equal(first.created, true); assert.equal(second.created, false); assert.equal(first.session.id, second.session.id);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  const link = join(directory, "link.json"); await symlink(path, link);
  await assert.rejects(readCredential(link), { code: "DEVELOPER_CREDENTIAL_UNAVAILABLE" });
  await chmod(path, 0o644); await assert.rejects(readCredential(path), { code: "DEVELOPER_CREDENTIAL_UNAVAILABLE" });
  await chmod(path, 0o600); await writeFile(path, JSON.stringify({ ...first.credential, path: "/private" }));
  await assert.rejects(readCredential(path), { code: "DEVELOPER_CREDENTIAL_UNAVAILABLE" });
  assert.ok(!JSON.stringify(safeDeveloperError(new Error("raw-secret"))).includes("raw-secret"));
});

test("MCP client discovers strict schemas, executes Sample flow, and observes immediate grant revocation", async t => {
  const { runtime, access, credential } = await setup(t, "sqlite");
  const server = createDeveloperMcp(runtime);
  const client = new Client({ name: "fracture-tests", version: "1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  t.after(async () => { await client.close(); await server.close(); });
  const tools = await client.listTools(); assert.deepEqual(tools.tools.map(item => item.name).sort(), Object.keys(toolDefinitions).sort());
  const definition = tools.tools.find(item => item.name === "run_curated_scenario")!;
  assert.equal(definition.inputSchema.additionalProperties, false);
  const response = await client.callTool({ name: "run_curated_scenario", arguments: input() });
  assert.notEqual(response.isError, true);
  const contents = response.content as { type: string; text: string }[];
  assert.equal(JSON.parse(contents[0]!.text).captureCount, 1);
  const bad = await client.callTool({ name: "run_curated_scenario", arguments: { ...input(), path: "/private" } }); assert.equal(bad.isError, true);
  await access.revoke(credential);
  const revoked = await client.callTool({ name: "list_experiments", arguments: {} }); assert.equal(revoked.isError, true);
  assert.ok(JSON.stringify(revoked).includes("DEVELOPER_ACCESS_DENIED"));
});

test("CLI, campaign worker and real stdio MCP share durable private scope across fresh processes", { skip: !process.env.DATABASE_URL }, async t => {
  const { connectionUrl, directory, service } = await setup(t, "postgres");
  const root = workspaceRoot(); const file = join(directory, "process-session.json");
  const env = { ...process.env, DATABASE_URL: connectionUrl!, FRACTURE_WORKSPACE_ROOT: root, FRACTURE_DEVELOPER_CREDENTIAL_FILE: file };
  const cli = async (...args: string[]) => JSON.parse((await execute(process.execPath, ["--import", "tsx", "apps/cli/src/index.ts", ...args], { cwd: root, env, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 })).stdout);
  const initialized = await cli("init"); assert.equal(initialized.created, true); assert.equal(initialized.source, "sample");
  assert.equal((await cli("init")).sessionId, initialized.sessionId);
  const run = await cli("call", "run_curated_scenario", JSON.stringify(input())); assert.equal(run.verdict, "pass");
  assert.equal((await cli("call", "get_run", JSON.stringify({ runId: run.id }))).id, run.id);
  const client = new Client({ name: "fracture-stdio-test", version: "1.0" });
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "apps/mcp/src/index.ts"], cwd: root, env: Object.fromEntries(Object.entries(env).filter((item): item is [string, string] => typeof item[1] === "string")), stderr: "pipe" });
  let stderr = ""; transport.stderr?.on("data", chunk => { stderr += chunk; });
  t.after(async () => { await client.close(); });
  await client.connect(transport);
  const response = await client.callTool({ name: "get_run", arguments: { runId: run.id } }); assert.notEqual(response.isError, true);
  assert.ok(JSON.stringify(response).includes(run.id));
  const campaignArgs = { scenarioIds: ["S0"], revisions: ["faulty", "hardened"], seed: "process-campaign-seed", requestId: randomUUID() };
  const queuedResponse = await client.callTool({ name: "create_campaign", arguments: campaignArgs }); assert.notEqual(queuedResponse.isError, true);
  const queued = JSON.parse((queuedResponse.content as { type: string; text: string }[])[0]!.text).campaign as CampaignLabDTO;
  assert.equal(queued.status, "queued"); assert.equal((await cli("call", "create_campaign", JSON.stringify(campaignArgs))).campaign.id, queued.id);
  const worker = () => execute(process.execPath, ["--import", "tsx", "scripts/campaign-worker.ts", "--once"], { cwd: root, env, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  await worker(); await worker();
  const completed = await cli("call", "get_campaign", JSON.stringify({ campaignId: queued.id })) as CampaignLabDTO;
  assert.equal(completed.status, "completed"); assert.equal(completed.counts.fail, 1); assert.equal(completed.counts.pass, 1);
  const exported = await client.callTool({ name: "export_campaign", arguments: { campaignId: queued.id } });
  assert.notEqual(exported.isError, true);
  const report = JSON.parse((exported.content as { type: string; text: string }[])[0]!.text);
  assert.equal(report.document.campaign.manifestHash, completed.manifestHash); assert.equal(report.document.runs.length, 2); assert.ok(report.document.evidence.length > 20);
  const reduction = await cli("call", "minimize_failure", JSON.stringify({ campaignId: completed.id, caseId: completed.cases[0]!.id, invariantId: "I2", requestId: randomUUID() }));
  assert.equal(reduction.campaign.manifest.kind, "minimization"); assert.equal(reduction.campaign.cases.length, 8);
  await cli("revoke");
  await worker();
  const stopped = await new CampaignLab(service.store).store.get(reduction.campaign.id);
  assert.equal(stopped.status, "cancelled"); assert.equal(stopped.counts.completed, 0);
  assert.equal((await client.callTool({ name: "get_run", arguments: { runId: run.id } })).isError, true);
  await client.close(); assert.equal(stderr, "");
});
