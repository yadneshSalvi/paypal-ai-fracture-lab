import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteDatabase } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { LabService, LabStore } from "../packages/service/src/index";
import { initializeDatabase } from "../packages/service/src/database";
import { DeveloperAccess } from "../packages/developer-tools/src/access";
import { importLocalSource } from "../packages/developer-tools/src/source-import";
import { createSourceWorkspaceStore } from "../packages/source-workspaces/src/index";
import { objectHash } from "../packages/source-workspaces/src/util";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { sessionCookie } from "../packages/service/src/auth";
import { POST as sessionPost } from "../apps/web/app/api/source-workspaces/session/route";
import { GET as indexGet, POST as importPost } from "../apps/web/app/api/source-workspaces/route";
import { POST as connectionPost } from "../apps/web/app/api/source-workspaces/connections/route";
import { GET as connectionGet, DELETE as connectionDelete } from "../apps/web/app/api/source-workspaces/connections/[connectionId]/route";
import { GET as snapshotGet } from "../apps/web/app/api/source-workspaces/[importId]/route";
import { GET as fileGet } from "../apps/web/app/api/source-workspaces/[importId]/files/route";
import { GET as exportGet } from "../apps/web/app/api/source-workspaces/[importId]/export/route";

const origin = "http://localhost:4576";
const sourceText = "export function checkoutReceipt() { return { status: 'unknown' }; }\n";
function request(path: string, options: { method?: string; cookie?: string; body?: string; origin?: string } = {}) {
  return new Request(origin + path, { method: options.method ?? "GET", headers: { ...(options.cookie ? { cookie: options.cookie } : {}), ...(options.method && options.method !== "GET" ? { "content-type": "application/json", origin: options.origin ?? origin } : {}) }, ...(options.body !== undefined ? { body: options.body } : {}) });
}
async function setup(t: TestContext) {
  const state = globalThis as typeof globalThis & { fractureApplicationDatabase?: Promise<SqlDatabase> };
  const previous = state.fractureApplicationDatabase;
  const previousSecret = process.env.JUDGE_SESSION_SECRET;
  process.env.JUDGE_SESSION_SECRET = randomBytes(32).toString("hex");
  const db = new SqliteDatabase(":memory:");
  await initializeDatabase(db);
  state.fractureApplicationDatabase = Promise.resolve(db);
  const lab = new LabStore(db);
  const service = new LabService(lab);
  const sources = new SourceAccessStore(lab);
  const developer = new DeveloperAccess(service);
  const owner = await developer.create();
  const directory = await realpath(await mkdtemp(join(tmpdir(), "fracture-source-api-")));
  const authorized = join(directory, "source");
  await mkdir(authorized, { mode: 0o700 });
  await writeFile(join(authorized, "checkout.ts"), sourceText);
  await writeFile(join(authorized, ".env"), "never-read-private-configuration");
  const local = await createSourceWorkspaceStore({ storageRoot: join(directory, "private"), allowedRoots: [{ id: "owned", directory: authorized }] });
  t.after(async () => {
    if (previous) state.fractureApplicationDatabase = previous; else delete state.fractureApplicationDatabase;
    if (previousSecret === undefined) delete process.env.JUDGE_SESSION_SECRET; else process.env.JUDGE_SESSION_SECRET = previousSecret;
    await db.close(); await rm(directory, { recursive: true, force: true });
  });
  return { db, lab, sources, developer, owner, local, directory };
}

test("source-only browser initialization creates no purchase, keeps the original expiry, and denies hosted imports", async t => {
  const f = await setup(t);
  assert.equal((await indexGet(request("/api/source-workspaces"))).status, 401);
  const initialized = await sessionPost(request("/api/source-workspaces/session", { method: "POST", body: "{}" }));
  assert.equal(initialized.status, 201);
  const cookie = initialized.headers.get("set-cookie")!.split(";")[0]!;
  assert.match(initialized.headers.get("set-cookie")!, /HttpOnly; SameSite=Lax/);
  const first = await initialized.json();
  assert.equal(first.data.runs.length, 0);
  const session = await f.lab.session(first.data.sessionId);
  assert.equal(session?.role, "judge");
  const repeated = await sessionPost(request("/api/source-workspaces/session", { method: "POST", cookie, body: "{}" }));
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).data.sessionId, session!.id);
  assert.equal((await f.lab.session(session!.id))?.expiresAt, session!.expiresAt);
  const forbidden = await importPost(request("/api/source-workspaces", { method: "POST", cookie, body: JSON.stringify({ rootId: "owned", path: ".", execute: true }) }));
  assert.equal(forbidden.status, 403);
  assert.equal((await forbidden.json()).error.code, "SOURCE_LOCAL_IMPORT_REQUIRED");
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  assert.equal((await f.db.query("SELECT id FROM lab_source_imports")).rowCount, 0);
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
});

test("source connection requests enforce origin, payload bounds, strict shape and browser ownership", async t => {
  const f = await setup(t);
  const browser = await f.lab.createSession();
  const stranger = await f.lab.createSession();
  const cookie = sessionCookie(browser, false).split(";")[0]!;
  const strangerCookie = sessionCookie(stranger, false).split(";")[0]!;
  const path = "/api/source-workspaces/connections";
  const cross = await connectionPost(request(path, { method: "POST", cookie, origin: "https://unapproved.example", body: JSON.stringify({ requestId: randomUUID() }) }));
  assert.equal(cross.status, 403);
  const oversized = await connectionPost(request(path, { method: "POST", cookie, body: JSON.stringify({ requestId: "x".repeat(33000) }) }));
  assert.equal(oversized.status, 413);
  const extra = await connectionPost(request(path, { method: "POST", cookie, body: JSON.stringify({ requestId: randomUUID(), grantId: f.owner.credential.id }) }));
  assert.equal(extra.status, 400);
  assert.equal((await f.db.query("SELECT id FROM lab_source_browser_connections")).rowCount, 0);
  const input = { requestId: randomUUID() };
  const first = await connectionPost(request(path, { method: "POST", cookie, body: JSON.stringify(input) }));
  assert.equal(first.status, 200);
  const value = (await first.json()).data;
  const second = await connectionPost(request(path, { method: "POST", cookie, body: JSON.stringify(input) }));
  assert.deepEqual((await second.json()).data, value);
  const context = { params: Promise.resolve({ connectionId: value.id }) };
  assert.equal((await connectionGet(request(path + "/" + value.id, { cookie: strangerCookie }), context)).status, 404);
  assert.equal((await connectionDelete(request(path + "/" + value.id, { method: "DELETE", cookie: strangerCookie }), context)).status, 404);
  assert.equal((await connectionDelete(request(path + "/" + value.id, { method: "DELETE", cookie }), context)).status, 200);
  assert.equal((await f.sources.connection(browser.id, value.id)).status, "cancelled");
});

test("source API returns only an approved hash-bound snapshot and withdraws file/export access on revocation", async t => {
  const f = await setup(t);
  const imported = await importLocalSource(f.sources, { sessionId: f.owner.session.id, grantId: f.owner.credential.id }, { rootId: "owned", path: ".", title: "Receipt checkout", requestId: randomUUID() }, f.local);
  const browser = await f.lab.createSession();
  const cookie = sessionCookie(browser, false).split(";")[0]!;
  const path = "/api/source-workspaces/" + imported.import.id;
  const context = { params: Promise.resolve({ importId: imported.import.id }) };
  const file = imported.snapshot!.files.find(item => item.path === "checkout.ts")!;
  const filePath = path + "/files?path=" + encodeURIComponent(file.path) + "&hash=" + file.hash;
  for (const response of [await snapshotGet(request(path, { cookie }), context), await fileGet(request(filePath, { cookie }), context), await exportGet(request(path + "/export", { cookie }), context)]) {
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(!(await response.text()).includes(sourceText));
  }
  const challenge = await f.sources.connect(browser.id, randomUUID());
  await f.sources.approve({ sessionId: f.owner.session.id, grantId: f.owner.credential.id }, { connectionId: challenge.id, importId: imported.import.id, requestId: randomUUID() });
  const read = await snapshotGet(request(path, { cookie }), context);
  assert.equal(read.status, 200);
  const accepted = (await read.json()).data;
  assert.equal(accepted.snapshot.manifestHash, imported.snapshot!.manifestHash);
  assert.equal(accepted.access.executeSource, false);
  await rm(f.directory, { recursive: true, force: true });
  const source = await fileGet(request(filePath, { cookie }), context);
  assert.equal(source.status, 200);
  assert.equal((await source.json()).data.content, sourceText);
  const mismatch = await fileGet(request(path + "/files?path=checkout.ts&hash=" + "0".repeat(64), { cookie }), context);
  assert.equal(mismatch.status, 409);
  const hidden = await fileGet(request(path + "/files?path=.env&hash=" + "0".repeat(64), { cookie }), context);
  assert.equal(hidden.status, 404);
  const exported = await exportGet(request(path + "/export", { cookie }), context);
  assert.equal(exported.status, 200);
  const report = await exported.json();
  const { contentHash, ...payload } = report;
  assert.equal(contentHash, objectHash(payload));
  assert.equal(exported.headers.get("x-content-sha256"), contentHash);
  assert.ok(exported.headers.get("content-disposition")!.includes(imported.import.id));
  assert.equal(report.execution.paymentProviderCalls, 0);
  assert.ok(!JSON.stringify(report).includes(f.directory));
  await f.developer.revoke(f.owner.credential);
  for (const response of [await snapshotGet(request(path, { cookie }), context), await fileGet(request(filePath, { cookie }), context), await exportGet(request(path + "/export", { cookie }), context)]) {
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(!(await response.text()).includes(sourceText));
  }
  assert.equal((await f.db.query("SELECT path FROM lab_source_files")).rowCount, 1);
  assert.equal((await f.db.query("SELECT id FROM lab_runs")).rowCount, 0);
  assert.equal((await f.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
});
