import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chmod, readFile, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { developerBearer } from "../packages/developer-tools/src/remote/credential";
import { initializeCredential, readCredential } from "../packages/developer-tools/src/access";
import type { RunDTO } from "../packages/contracts/src/index";
import { assertNoSecrets, fixture, root, sampleArgs, textResult } from "./remote-mcp-fixture";

const execute = promisify(execFile);
const script = join(root, "apps/cli/src/remote-bridge.ts");
const loader = join(root, "node_modules/tsx/dist/loader.mjs");

async function bridge(t: TestContext, f: Awaited<ReturnType<typeof fixture>>, changes: Record<string, string> = {}) {
  const path = join(f.directory, `capability-${randomUUID()}.json`);
  await writeFile(path, JSON.stringify(f.owner.credential) + "\n", { mode: 0o600 });
  const env = { PATH: process.env.PATH!, FRACTURE_REMOTE_MCP_ORIGIN: f.origin, FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK: "1", FRACTURE_DEVELOPER_CREDENTIAL_FILE: path, DATABASE_URL: "postgresql://private-db-sentinel@private.invalid/fracture", OPENAI_API_KEY: "private-provider-sentinel", ...changes };
  const client = new Client({ name: "real-editor-stdio-test", version: "1.0.0" });
  client.onerror = () => {};
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", loader, script], cwd: root, env, stderr: "pipe" });
  let stderr = "";
  transport.stderr?.on("data", chunk => { stderr += chunk; });
  t.after(async () => { await client.close(); });
  await client.connect(transport, { timeout: 10_000 });
  return { client, transport, path, env, stderr: () => stderr };
}

test("real editor SDK stdio subprocess bridges private capability to real SDK HTTP without expanding its environment", async t => {
  const f = await fixture(t);
  const b = await bridge(t, f);
  const tools = await b.client.listTools();
  assert.ok(tools.tools.some(tool => tool.name === "run_curated_scenario"));
  assert.ok(!tools.tools.some(tool => tool.name === "import_source_workspace"));
  const args = sampleArgs();
  const run = textResult<RunDTO>(await b.client.callTool({ name: "run_curated_scenario", arguments: args }));
  assert.equal(run.captureCount, 1); assert.equal(run.source, "sample");
  const received = f.seen.find(item => (item.message as { method?: string })?.method === "tools/call")!;
  assert.deepEqual((received.message as { params: { arguments: unknown } }).params.arguments, args);
  assert.equal(received.headers.get("authorization"), `Bearer ${developerBearer(f.owner.credential)}`);
  assert.equal(received.headers.get("cookie"), null); assert.equal(received.headers.get("x-api-key"), null);
  assertNoSecrets(JSON.stringify([...received.headers].filter(([name]) => name !== "authorization")), ["private-provider-sentinel", "private-db-sentinel"]);
  await b.client.close();
  assert.equal(b.stderr(), "");
  assertNoSecrets(JSON.stringify([tools, run, b.stderr()]), [f.owner.credential.secret, "private-provider-sentinel", "private-db-sentinel"]);
  assert.equal((await f.db.query("SELECT id FROM lab_developer_grants")).rowCount, 1);
});

test("lost create acknowledgement keeps exact request identity; recovery is a read and never automatic redispatch", async t => {
  const f = await fixture(t);
  const b = await bridge(t, f);
  const args = sampleArgs();
  f.dropResponse();
  await assert.rejects(b.client.callTool({ name: "run_curated_scenario", arguments: args }), error => {
    assert.match(String(error), /Remote acknowledgement unavailable/); return true;
  });
  const calls = () => f.seen.filter(item => (item.message as { params?: { name?: string } })?.params?.name === "run_curated_scenario");
  assert.equal(calls().length, 1);
  const recovered = textResult<{ runs: RunDTO[] }>(await b.client.callTool({ name: "list_experiments", arguments: {} }));
  assert.equal(recovered.runs.length, 1);
  const run = textResult<RunDTO>(await b.client.callTool({ name: "get_run", arguments: { runId: recovered.runs[0]!.id } }));
  assert.equal(run.captureCount, 1); assert.equal(calls().length, 1);
  // A deliberate caller retry with the original body returns the existing run.
  assert.equal(textResult<RunDTO>(await b.client.callTool({ name: "run_curated_scenario", arguments: args })).id, run.id);
  assert.equal((await f.service.store.runs(f.owner.session.id)).length, 1);
  assertNoSecrets(b.stderr(), [f.owner.credential.secret, developerBearer(f.owner.credential), "private-provider-sentinel", "private-db-sentinel"]);
});

test("unknown diagnosis acknowledgement retains the original durable action and get_run does not invoke it again", async t => {
  const f = await fixture(t);
  const run = await f.service.startRun(f.owner.session.id, { projectId: "bramble", ...sampleArgs(), revision: "faulty", mode: "sample", interactive: false });
  let dispatched = 0;
  // A deterministic, local-only dispatch sentinel replaces the external model.
  // The real runtime still authorizes and claims the same SQL action identity.
  f.service.action = async (sessionId, runId, input) => {
    const state = await f.service.store.claimAction(sessionId, runId, input.requestId, input.action, { runId, ...input });
    if (state === "claimed") dispatched++;
    return f.service.store.run(runId, sessionId);
  };
  const b = await bridge(t, f);
  const args = { runId: run.id, requestId: randomUUID() };
  f.dropResponse();
  await assert.rejects(b.client.callTool({ name: "diagnose_run", arguments: args }), /Remote acknowledgement unavailable/);
  assert.equal(dispatched, 1);
  assert.equal(textResult<RunDTO>(await b.client.callTool({ name: "get_run", arguments: { runId: run.id } })).id, run.id);
  assert.equal(dispatched, 1);
  const action = (await f.db.query("SELECT id,stage FROM lab_actions WHERE session_id=$1", [f.owner.session.id])).rows;
  assert.deepEqual(action, [{ id: args.requestId, stage: "running" }]);
  assert.equal(f.seen.filter(item => (item.message as { params?: { name?: string } })?.params?.name === "diagnose_run").length, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
});

test("closing stdio during an accepted action aborts observation while a fresh client recovers its original run", async t => {
  const f = await fixture(t);
  const run = await f.service.startRun(f.owner.session.id, { projectId: "bramble", ...sampleArgs(), revision: "faulty", mode: "sample", interactive: false });
  let started!: () => void; let release!: () => void;
  const accepted = new Promise<void>(resolve => { started = resolve; });
  const finish = new Promise<void>(resolve => { release = resolve; });
  t.after(() => release());
  let dispatched = 0;
  f.service.action = async (sessionId, runId, input) => {
    const state = await f.service.store.claimAction(sessionId, runId, input.requestId, input.action, { runId, ...input });
    if (state === "claimed") dispatched++;
    started(); await finish;
    return f.service.store.run(runId, sessionId);
  };
  const b = await bridge(t, f);
  const args = { runId: run.id, requestId: randomUUID() };
  const pending = b.client.callTool({ name: "diagnose_run", arguments: args });
  const stopped = assert.rejects(pending, /closed|acknowledgement|cancel/i);
  await accepted;
  await b.client.close();
  await stopped;
  release();
  const next = await bridge(t, f);
  assert.equal(textResult<RunDTO>(await next.client.callTool({ name: "get_run", arguments: { runId: run.id } })).id, run.id);
  assert.equal(dispatched, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_actions WHERE id=$1", [args.requestId])).rowCount, 1);
});

test("an established stdio bridge cannot refresh, replace or use a revoked original grant", async t => {
  const f = await fixture(t);
  const b = await bridge(t, f);
  await b.client.listTools();
  await f.access.revoke(f.owner.credential);
  await assert.rejects(b.client.listTools(), /Remote acknowledgement unavailable/);
  await assert.rejects(b.client.callTool({ name: "list_experiments", arguments: {} }), /Remote acknowledgement unavailable/);
  assert.equal((await f.db.query("SELECT id FROM lab_developer_grants")).rowCount, 1);
  assertNoSecrets(b.stderr(), [f.owner.credential.secret, developerBearer(f.owner.credential)]);
});

test("credential-bearing backend error text is never copied into stdout errors or stderr diagnostics", async t => {
  const f = await fixture(t);
  const b = await bridge(t, f);
  const secrets = [f.owner.credential.secret, developerBearer(f.owner.credential), "private-provider-sentinel", "private-db-sentinel"];
  f.failResponse(secrets.join(" "));
  await assert.rejects(b.client.callTool({ name: "list_experiments", arguments: {} }), error => {
    assert.match(String(error), /Remote acknowledgement unavailable/);
    assertNoSecrets(String(error), secrets); return true;
  });
  assertNoSecrets(b.stderr(), secrets);
  assert.equal(f.seen.filter(item => (item.message as { params?: { name?: string } })?.params?.name === "list_experiments").length, 1);
});

test("the extracted guarded reader preserves local init/authorize/revoke and rejects unsafe private files", async t => {
  const f = await fixture(t);
  const path = join(f.directory, "existing-local.json");
  const initialized = await initializeCredential(f.access, path);
  assert.equal((await initializeCredential(f.access, path)).session.id, initialized.session.id);
  assert.equal((await f.access.authorize(await readCredential(path))).id, initialized.session.id);
  const link = join(f.directory, "linked.json"); await symlink(path, link);
  await assert.rejects(readCredential(link), { code: "DEVELOPER_CREDENTIAL_UNAVAILABLE" });
  await chmod(path, 0o644); await assert.rejects(readCredential(path), { code: "DEVELOPER_CREDENTIAL_UNAVAILABLE" });
  await chmod(path, 0o600);
  await f.access.revoke(initialized.credential);
  await assert.rejects(f.access.authorize(await readCredential(path)), { code: "DEVELOPER_ACCESS_DENIED" });
});

test("bridge imports neither dotenv nor server configuration, even from a directory containing .env", async t => {
  const f = await fixture(t);
  await writeFile(join(f.directory, ".env"), "REMOTE_DOTENV_SENTINEL=must-not-load\nDATABASE_URL=must-not-expand\n");
  const source = `await import(${JSON.stringify(script)}); process.stdout.write(JSON.stringify({dotenvLoaded: process.env.REMOTE_DOTENV_SENTINEL !== undefined, databaseLoaded: process.env.DATABASE_URL !== undefined}));`;
  const observed = await execute(process.execPath, ["--import", loader, "--input-type=module", "-e", source], { cwd: f.directory, env: { NODE_ENV: "test", PATH: process.env.PATH!, FRACTURE_WORKSPACE_ROOT: f.directory }, timeout: 10_000 });
  assert.deepEqual(JSON.parse(observed.stdout), { dotenvLoaded: false, databaseLoaded: false });
  assert.equal(observed.stderr, "");
  // The bridge's entire local dependency graph must continue to omit access.ts,
  // whose legacy API intentionally retains server configuration/default paths.
  assert.ok(!(await readFile(script, "utf8")).includes("src/access"));
});

test("bridge startup refuses unsafe files and destination settings with static stderr and empty stdout", async t => {
  const f = await fixture(t);
  const path = join(f.directory, "startup.json");
  await writeFile(path, JSON.stringify(f.owner.credential), { mode: 0o600 });
  const link = join(f.directory, "startup-link.json"); await symlink(path, link);
  const cases = [
    { origin: f.origin, path: link, loopback: "1" },
    { origin: "https://unapproved.example/api/mcp", path, loopback: "0" },
    { origin: "http://unapproved.example", path, loopback: "0" },
    { origin: f.origin, path, loopback: "0" },
  ];
  for (const input of cases) {
    try {
      await execute(process.execPath, ["--import", loader, script], { cwd: root, env: { NODE_ENV: "test", PATH: process.env.PATH!, FRACTURE_REMOTE_MCP_ORIGIN: input.origin, FRACTURE_REMOTE_MCP_ALLOW_LOOPBACK: input.loopback, FRACTURE_DEVELOPER_CREDENTIAL_FILE: input.path }, timeout: 10_000 });
      assert.fail("An unsafe bridge started.");
    } catch (error) {
      const output = error as { code: number; stdout: string; stderr: string };
      assert.equal(output.code, 1); assert.equal(output.stdout, "");
      assert.match(output.stderr, /could not start/);
      assertNoSecrets(output.stderr, [f.owner.credential.secret, input.path]);
    }
  }
});
