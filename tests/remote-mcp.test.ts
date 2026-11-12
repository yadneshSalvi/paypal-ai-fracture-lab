import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunDTO } from "../packages/contracts/src/index";
import type { CampaignLabDTO } from "../packages/contracts/src/campaign-lab";
import { DeveloperRuntime, toolDefinitions } from "../packages/developer-tools/src/runtime";
import { hostedFilesystemTools, handleRemoteMcp } from "../packages/developer-tools/src/remote-mcp";
import { developerBearer } from "../packages/developer-tools/src/remote/credential";
import { REMOTE_MCP_MAX_REQUEST_BYTES } from "../packages/developer-tools/src/remote/policy";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { importLocalSource } from "../packages/developer-tools/src/source-import";
import { createSourceWorkspaceStore } from "../packages/source-workspaces/src/index";
import { assertNoSecrets, fixture, sampleArgs, textResult } from "./remote-mcp-fixture";

const rpc = (method: string, params: unknown = {}) => ({ jsonrpc: "2.0", id: randomUUID(), method, params });

test("real SDK Streamable HTTP initialization, notifications, lists, calls and disconnects are stateless", async t => {
  const f = await fixture(t);
  const { client, transport } = await f.connect();
  assert.equal(transport.sessionId, undefined);
  assert.equal(client.getServerVersion()?.name, "fracture-lab-remote");
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(tool => tool.name).sort(), Object.keys(toolDefinitions).filter(name => !hostedFilesystemTools.has(name)).sort());
  assert.equal(tools.tools.find(tool => tool.name === "run_curated_scenario")!.inputSchema.additionalProperties, false);
  await client.ping();
  const notify = await f.request({ jsonrpc: "2.0", method: "notifications/initialized" });
  assert.equal(notify.status, 202); assert.equal(await notify.text(), "");
  assert.equal(notify.headers.get("mcp-session-id"), null);
  for (const method of ["GET", "DELETE"]) {
    const response = await handleRemoteMcp(new Request(f.endpoint, { method, headers: { authorization: `Bearer ${developerBearer(f.owner.credential)}` } }), f.options);
    assert.equal(response.status, method === "GET" ? 405 : 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("mcp-session-id"), null);
  }
  const args = sampleArgs();
  const first = textResult<RunDTO>(await client.callTool({ name: "run_curated_scenario", arguments: args }));
  assert.equal(first.source, "sample"); assert.equal(first.captureCount, 1); assert.equal(first.verdict, "pass");
  const second = textResult<RunDTO>(await client.callTool({ name: "run_curated_scenario", arguments: args }));
  assert.equal(second.id, first.id);
  const conflict = await client.callTool({ name: "run_curated_scenario", arguments: { ...args, revision: "faulty" } });
  assert.equal(conflict.isError, true); assert.match(JSON.stringify(conflict), /RUN_PAYLOAD_CONFLICT/);
  const report = textResult<{ run: RunDTO; evidence: unknown[] }>(await client.callTool({ name: "export_report", arguments: { runId: first.id } }));
  assert.equal(report.run.id, first.id); assert.ok(report.evidence.length > 10);
  await client.close();
  const fresh = (await f.connect()).client;
  assert.equal(textResult<RunDTO>(await fresh.callTool({ name: "get_run", arguments: { runId: first.id } })).id, first.id);
  assert.equal((await f.service.store.runs(f.owner.session.id)).length, 1);
});

for (const change of ["revocation", "grant expiry", "session expiry"] as const) test(`established SDK clients cannot initialize, list, call or disconnect after ${change}`, async t => {
  const f = await fixture(t);
  const { client } = await f.connect();
  await client.listTools();
  if (change === "revocation") await f.access.revoke(f.owner.credential);
  if (change === "grant expiry") await f.db.query("UPDATE lab_developer_grants SET expires_at=$2 WHERE id=$1", [f.owner.credential.id, "2000-01-01T00:00:00.000Z"]);
  if (change === "session expiry") await f.db.query("UPDATE lab_sessions SET expires_at=$2 WHERE id=$1", [f.owner.session.id, "2000-01-01T00:00:00.000Z"]);
  const unauthorized = (error: unknown) => { assert.equal((error as { code: number }).code, 401); return true; };
  await assert.rejects(client.listTools(), unauthorized);
  await assert.rejects(client.callTool({ name: "list_experiments", arguments: {} }), unauthorized);
  for (const method of ["GET", "DELETE", "OPTIONS"]) {
    const response = await handleRemoteMcp(new Request(f.endpoint, { method, headers: { authorization: `Bearer ${developerBearer(f.owner.credential)}` } }), f.options);
    assert.equal(response.status, 401);
    assertNoSecrets(await response.text(), [f.owner.credential.secret, developerBearer(f.owner.credential)]);
  }
  const init = await f.request(rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "expired", version: "1" } }));
  assert.equal(init.status, 401); assert.equal(init.headers.get("www-authenticate"), 'Bearer realm="fracture-lab"');
  assert.equal((await f.service.store.runs(f.owner.session.id)).length, 0);
});

test("bearer authentication is required for initialize/list and never accepts browser cookies or new owner grants", async t => {
  const f = await fixture(t);
  for (const authorization of [undefined, "Bearer invalid", `Bearer ${JSON.stringify(f.owner.credential)}`, `Bearer fracture-v1.${randomUUID()}.${f.owner.credential.secret}`]) {
    const response = await handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", cookie: "fracture_session=not-authority", ...(authorization ? { authorization } : {}) }, body: JSON.stringify(rpc("tools/list")) }), f.options);
    assert.equal(response.status, 401);
    assertNoSecrets(await response.text(), [f.owner.credential.secret]);
  }
  assert.equal((await f.db.query("SELECT id FROM lab_developer_grants")).rowCount, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_sessions")).rowCount, 1);
});

test("grant revocation while a request body arrives also prevents SDK tool discovery", async t => {
  const f = await fixture(t);
  let reading!: () => void; let finish!: () => void;
  const bodyReadStarted = new Promise<void>(resolve => { reading = resolve; });
  const message = JSON.stringify(rpc("tools/list"));
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode(message.slice(0, 1))); finish = () => { controller.enqueue(new TextEncoder().encode(message.slice(1))); controller.close(); }; },
    pull() { reading(); },
  });
  const response = handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { authorization: `Bearer ${developerBearer(f.owner.credential)}`, "content-type": "application/json", accept: "application/json, text/event-stream" }, body, duplex: "half" } as RequestInit), f.options);
  await bodyReadStarted;
  await f.access.revoke(f.owner.credential);
  finish();
  assert.equal((await response).status, 401);
});

test("cross-owner runs and private saved sources are denied; exact source-view approval retains its authority", async t => {
  const f = await fixture(t);
  const other = await f.access.create();
  const current = (await f.connect()).client;
  const stranger = (await f.connect(other.credential)).client;
  const run = textResult<RunDTO>(await current.callTool({ name: "run_curated_scenario", arguments: sampleArgs() }));
  for (const name of ["get_run", "export_report", "propose_repair", "diagnose_run"]) {
    const denied = await stranger.callTool({ name, arguments: { runId: run.id, ...(["propose_repair", "diagnose_run"].includes(name) ? { requestId: randomUUID() } : {}) } });
    assert.equal(denied.isError, true); assert.match(JSON.stringify(denied), /RUN_NOT_FOUND/);
  }
  const repository = join(f.directory, "owned-repository"); await mkdir(repository);
  const sourceText = "export const receipt = { status: 'unknown' };\n";
  await writeFile(join(repository, "receipt.ts"), sourceText);
  await writeFile(join(repository, "package.json"), JSON.stringify({ scripts: { test: "exit 91" } }));
  const local = await createSourceWorkspaceStore({ storageRoot: join(f.directory, "snapshots"), allowedRoots: [{ id: "owned", directory: repository }] });
  const sources = new SourceAccessStore(f.service.store);
  const imported = await importLocalSource(sources, { sessionId: f.owner.session.id, grantId: f.owner.credential.id }, { rootId: "owned", path: ".", title: "Private remote receipt", requestId: randomUUID() }, local);
  const importId = imported.import.id;
  const file = imported.snapshot!.files.find(file => file.path === "receipt.ts")!;
  const read = textResult<{ content: string }>(await current.callTool({ name: "read_source_file", arguments: { importId, path: file.path, expectedHash: file.hash } }));
  assert.equal(read.content, sourceText); assert.equal(imported.snapshot!.tools.commandsExecuted, 0);
  for (const name of ["get_source_workspace", "read_source_file", "export_source_snapshot"]) {
    const denied = await stranger.callTool({ name, arguments: { importId, ...(name === "read_source_file" ? { path: file.path, expectedHash: file.hash } : {}) } });
    assert.equal(denied.isError, true); assert.match(JSON.stringify(denied), /SOURCE_ACCESS_DENIED/); assert.ok(!JSON.stringify(denied).includes(sourceText));
  }
  const browser = await f.service.store.createSession();
  const connection = await sources.connect(browser.id, randomUUID());
  const args = { connectionId: connection.id, importId, requestId: randomUUID() };
  assert.equal((await stranger.callTool({ name: "approve_source_view", arguments: args })).isError, true);
  textResult(await current.callTool({ name: "approve_source_view", arguments: args }));
  assert.equal((await sources.get(browser.id, importId)).access.readSource, true);
  assert.equal((await sources.connection(browser.id, connection.id)).importId, importId);
  const extra = await current.callTool({ name: "approve_source_view", arguments: { ...args, execution: true } });
  assert.equal(extra.isError, true);
  await f.access.revoke(f.owner.credential);
  await assert.rejects(sources.readFile(browser.id, importId, file.path, file.hash), { code: "SOURCE_ACCESS_DENIED" });
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
});

test("hosted filesystem tools are absent and refused; bounded schemas and existing runtime quotas remain enforced", async t => {
  const f = await fixture(t);
  const { client } = await f.connect();
  for (const name of hostedFilesystemTools) {
    const result = await client.callTool({ name, arguments: { rootId: "arbitrary", path: ".", importId: randomUUID(), requestId: randomUUID() } });
    assert.equal(result.isError, true); assert.match(JSON.stringify(result), /not found/);
  }
  for (const name of ["source.import_source_workspace", "import_source_workspace/..", "IMPORT_SOURCE_WORKSPACE", "import_source_workspace ", "__proto__", "constructor", "toString"]) assert.equal((await client.callTool({ name, arguments: {} })).isError, true);
  for (const method of ["import_source_workspace", "check_source_changes", "resources/read"]) {
    const response = await f.request(rpc(method, { uri: "file:///private/never-opened" }));
    assert.equal((await response.json()).error.code, -32601);
  }
  for (const extra of [{ amount: 1200 }, { url: "https://api-m.sandbox.paypal.com/v2/checkout/orders" }, { path: "/private" }, { mode: "live_sandbox" }]) assert.equal((await client.callTool({ name: "run_curated_scenario", arguments: { ...sampleArgs(), ...extra } })).isError, true);
  await f.db.query("INSERT INTO lab_rate_windows(key,window_key,count) VALUES($1,$2,20)", [`developer:${f.owner.credential.id}:run`, String(Math.floor(Date.now() / 3600000))]);
  const limited = await client.callTool({ name: "run_curated_scenario", arguments: sampleArgs() });
  assert.equal(limited.isError, true); assert.match(JSON.stringify(limited), /RATE_LIMIT/);
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
});

test("HTTP boundary rejects browser cross-origin actions, unexpected methods, URLs and stateful replay headers", async t => {
  const f = await fixture(t);
  const base = { accept: "application/json, text/event-stream", "content-type": "application/json", authorization: `Bearer ${developerBearer(f.owner.credential)}` };
  for (const headers of [{ origin: "https://other.example" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
    const response = await handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { ...base, ...headers }, body: JSON.stringify(rpc("tools/list")) }), f.options);
    assert.equal(response.status, 403); assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  for (const method of ["PUT", "PATCH", "OPTIONS", "HEAD"]) {
    const response = await handleRemoteMcp(new Request(f.endpoint, { method, headers: base }), f.options);
    assert.equal(response.status, 405); assert.equal(response.headers.get("allow"), "POST, DELETE");
    if (method === "HEAD") assert.equal(await response.text(), "");
  }
  for (const suffix of ["?capability=private-sentinel", "/other"]) {
    const response = await handleRemoteMcp(new Request(f.endpoint.href + suffix, { method: "POST", headers: base, body: "{}" }), f.options);
    assert.equal(response.status, 403); assert.ok(!(await response.text()).includes("private-sentinel"));
  }
  for (const headers of [{ "mcp-session-id": randomUUID() }, { "last-event-id": "old-response" }]) assert.equal((await handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { ...base, ...headers }, body: JSON.stringify(rpc("tools/list")) }), f.options)).status, 400);
  assert.equal((await handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { ...base, origin: f.origin }, body: JSON.stringify(rpc("tools/list")) }), f.options)).status, 200);
});

test("HTTP bytes, media types, UTF-8 and SDK protocol errors are bounded before any domain call", async t => {
  const f = await fixture(t);
  const base = { accept: "application/json, text/event-stream", "content-type": "application/json", authorization: `Bearer ${developerBearer(f.owner.credential)}` };
  const post = (body: BodyInit, headers: Record<string, string> = {}) => handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: { ...base, ...headers }, body }), f.options);
  assert.equal((await post("{}", { accept: "application/json" })).status, 406);
  for (const accept of ["application/json-malicious, text/event-stream", "application/json;q=0, text/event-stream", "application/json, text/event-stream;q=0"]) assert.equal((await post("{}", { accept })).status, 406);
  for (const media of ["text/plain", "application/json-malicious", "application/json; charset=iso-8859-1"]) assert.equal((await post("{}", { "content-type": media })).status, 415);
  assert.equal((await post("{}", { "content-encoding": "gzip" })).status, 415);
  assert.equal((await post("not JSON")).status, 400);
  assert.equal((await post(new Uint8Array([0xff]).buffer)).status, 400);
  assert.equal((await post("{}", { "content-length": String(REMOTE_MCP_MAX_REQUEST_BYTES + 1) })).status, 413);
  assert.equal((await post("{}", { "content-length": "-1" })).status, 400);
  assert.equal((await post(" ".repeat(REMOTE_MCP_MAX_REQUEST_BYTES - 2) + "{}")).status, 400);
  assert.equal((await post(" ".repeat(REMOTE_MCP_MAX_REQUEST_BYTES - 1) + "{}")).status, 413);
  const chunks = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(REMOTE_MCP_MAX_REQUEST_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } });
  assert.equal((await handleRemoteMcp(new Request(f.endpoint, { method: "POST", headers: base, body: chunks, duplex: "half" } as RequestInit), f.options)).status, 413);
  assert.equal((await post(JSON.stringify([rpc("tools/list")]))).status, 400);
  assert.equal((await post(JSON.stringify(rpc("tools/list")), { "mcp-protocol-version": "invalid-version" })).status, 400);
  const unknown = await post(JSON.stringify(rpc("not/a/tool")));
  assert.equal((await unknown.json()).error.code, -32601);
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
});

test("queued repair and campaign commands recover their stable hook after unknown dispatch without repeating a domain command", async t => {
  const repairs: string[] = []; const campaigns: string[] = [];
  let failRepair = true; let failCampaign = true;
  const f = await fixture(t, {
    dispatchRepair: async id => { repairs.push(id); if (failRepair) throw new Error("private-dispatch-sentinel"); return "original-workflow"; },
    dispatchCampaign: async id => { campaigns.push(id); if (failCampaign) throw new Error("private-dispatch-sentinel"); return "original-workflow"; },
  });
  const { client } = await f.connect();
  const run = await new DeveloperRuntime(f.service, f.owner.credential).call("run_curated_scenario", { ...sampleArgs(), revision: "faulty" }) as RunDTO;
  const repairArgs = { runId: run.id, requestId: randomUUID() };
  const first = await client.callTool({ name: "propose_repair", arguments: repairArgs });
  textResult(first);
  assert.equal((first._meta?.["fracture/dispatch"] as { status: string }).status, "pending");
  failRepair = false;
  const recovered = await client.callTool({ name: "propose_repair", arguments: repairArgs });
  assert.equal((recovered._meta?.["fracture/dispatch"] as { status: string }).status, "accepted");
  assert.deepEqual(repairs, [`repair:${f.owner.session.id}:${repairArgs.requestId}`, `repair:${f.owner.session.id}:${repairArgs.requestId}`]);
  assert.equal((await f.db.query("SELECT id FROM lab_repair_jobs")).rowCount, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_actions")).rowCount, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
  const args = { scenarioIds: ["S0"], revisions: ["faulty", "hardened"], seed: "remote-campaign-seed", requestId: randomUUID() };
  const queued = await client.callTool({ name: "create_campaign", arguments: args });
  const campaign = textResult<{ campaign: CampaignLabDTO }>(queued).campaign;
  assert.equal((queued._meta?.["fracture/dispatch"] as { status: string }).status, "pending");
  failCampaign = false;
  const repeated = await client.callTool({ name: "create_campaign", arguments: args });
  assert.equal(textResult<{ campaign: CampaignLabDTO }>(repeated).campaign.id, campaign.id);
  assert.deepEqual(campaigns, [campaign.id, campaign.id]);
  assert.equal((await client.callTool({ name: "create_campaign", arguments: { ...args, seed: "changed-seed" } })).isError, true);
  await client.callTool({ name: "stop_campaign", arguments: { campaignId: campaign.id, requestId: randomUUID() } });
  assert.equal(campaigns.length, 2);
  assertNoSecrets(JSON.stringify([first, recovered, queued, repeated]), ["private-dispatch-sentinel", f.owner.credential.secret]);
});
