import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire, register } from "node:module";
import { act, createElement, StrictMode } from "react";
import type { WorkspaceDTO } from "@fracture/contracts";
import type { SourceBrowserConnection, SourceFileView, SourceImportSummary, SourceSnapshotExport, SourceWorkspaceIndex, SourceWorkspaceView } from "../packages/contracts/src/source-workspaces";
import type { SourceChangeReceipt, SourceIntegrationNode, SourceWorkspaceSnapshot } from "../packages/source-workspaces/src/types";
import { objectHash, sourceSpan } from "../packages/source-workspaces/src/util";

register("./helpers/css-module-loader.mjs", import.meta.url);
const { JSDOM } = createRequire(new URL("./component-runtime/package.json", import.meta.url))("jsdom") as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/sources", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "HTMLDialogElement", "Event", "MouseEvent", "KeyboardEvent", "Node"] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLElement.prototype.scrollIntoView = function () { /* jsdom has no layout. Actual focus is asserted below. */ };
dom.window.matchMedia = (query: string) => ({ media: query, matches: false, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; queueMicrotask(() => this.dispatchEvent(new dom.window.Event("close"))); };

const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { PathnameContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime.js");
const { WorkspaceProvider, useWorkspace } = await import("../apps/web/components/workspace-provider");
const { SourceAtlas } = await import("../apps/web/components/source-workspaces");

const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const sessionId = randomUUID(), importId = randomUUID(), connectionId = randomUUID();
const now = "2026-11-12T10:00:00.000Z", future = "2099-01-01T00:00:00.000Z";
const ALPHA = 'export async function alpha() { const label = "SOURCE_ALPHA_PRIVATE_TEXT"; return fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders/order/capture", {method: "POST"}); }\n';
const BETA = 'export async function beta() { const label = "SOURCE_BETA_PRIVATE_TEXT"; return fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders/order", {method: "GET"}); }\n';
const workspace: WorkspaceDTO = {
  version: "1.0", sessionId, createdAt: now, source: "sample",
  policy: { sandboxOnly: true, maxCaptures: 0, maxGrossMinor: 0, currency: "USD", liveEnabled: false, reason: "Unseeded controlled DOM scope" },
  projects: [], scenarios: [], runs: [], campaigns: [], repairs: [], providerFacts: [], contractRows: [], evaluations: [], evidence: [], selectedRunId: null, metrics: [], work: [],
  errand: { projectId: "errand", title: "Errand", summary: "Unused controlled DOM structure", source: "sample", unprotectedOrderIds: [], hardenedOrderIds: [], chargeCount: 0, toolCalls: [], limitations: [] },
};
function snapshotFixture(): SourceWorkspaceSnapshot {
  const files = [["alpha.ts", ALPHA], ["beta.ts", BETA]] as const;
  const nodes: SourceIntegrationNode[] = files.flatMap(([path, text], index) => {
    const hash = digest(text), source = sourceSpan(path, hash, text, 0, text.length), start = text.indexOf("fetch(");
    return [
      { id: `file-${index}`, kind: "file", label: path, confidence: "syntax", evidence: { type: "typescript_ast", source } },
      { id: `operation-${index}`, kind: "provider_operation", label: index === 0 ? "POST PayPal capture" : "GET PayPal resource", confidence: "syntax", adapter: "raw_http", operation: index === 0 ? "POST PayPal capture" : "GET PayPal resource", identity: "absent", evidence: { type: "typescript_ast", source: sourceSpan(path, hash, text, start, text.lastIndexOf(");") + 1) } },
    ];
  });
  const toolBody = { schemaVersion: "fracture.source-tools/v1" as const, tools: [], dependencyManifests: [], lockfiles: [], commandsExecuted: 0 as const, dependenciesInstalled: false as const };
  const base = {
    schemaVersion: "fracture.source-workspace/v1" as const, id: "sws_" + "a".repeat(64), revisionHash: digest("Controlled DOM source revision"), createdAt: now, authorityId: "dom-root",
    files: files.map(([path, text]) => ({ path, hash: digest(text), bytes: Buffer.byteLength(text), language: "typescript" as const })), totalBytes: Buffer.byteLength(ALPHA + BETA), exclusions: [],
    tools: { ...toolBody, hash: objectHash(toolBody) },
    graph: {
      schemaVersion: "fracture.source-graph/v1" as const, mode: "static" as const, runtimeObserved: false as const, nodes,
      edges: [{ id: "static-edge", from: "file-0", to: "operation-0", relation: "calls" as const, confidence: "syntax" as const, evidence: nodes[1]!.evidence }],
      findings: [{ id: "risk-identity", category: "missing_provider_identity" as const, severity: "risk" as const, title: "Payment write has no resolved provider request identity", explanation: "Controlled static review lead. This is not a reproduced payment defect.", nodeIds: ["operation-0"], evidence: [nodes[1]!.evidence], runtimeEvidenceRequired: true as const }],
      coverage: [{ language: "typescript" as const, status: "parsed" as const, files: 2, parsedFiles: 2, limitations: ["Controlled DOM receipt; compiler behavior is covered by separate real-parser tests."] }],
      limitations: ["Syntax is not runtime evidence.", "Package installation and operation contracts are not verified."],
    },
    execution: { contractVersion: "fracture.source-adapter/v1" as const, status: "static_only" as const, arbitrarySourceExecution: false as const, requiredGates: ["An isolated execution adapter must qualify separately."] },
  };
  return { ...base, manifestHash: objectHash(base) };
}
const snapshot = snapshotFixture();
function summary(): SourceImportSummary { return { id: importId, title: "Controlled source checkout", rootId: "dom-root", path: "checkout", createdAt: now, expiresAt: future, status: "ready", errorCode: null, snapshotId: snapshot.id, revisionHash: snapshot.revisionHash, files: 2, bytes: snapshot.totalBytes, findings: 1, provenance: "authorized_source_snapshot", analysis: "static", runtimeObserved: false, access: "approved_view" }; }
function indexFixture(ready = true): SourceWorkspaceIndex { return { imports: ready ? [summary()] : [], connections: [], capabilities: { browserImport: false, browserExecution: false, localImport: "authenticated_cli", connection: "explicit_cli_approval" } }; }
function viewFixture(): SourceWorkspaceView { return { import: summary(), snapshot: structuredClone(snapshot), latestChanges: null, changeChecks: [], access: { readSource: true, executeSource: false, authorizePayments: false, expiresAt: future } }; }
function connectionFixture(status: SourceBrowserConnection["status"] = "pending"): SourceBrowserConnection { return { id: connectionId, requestId: randomUUID(), confirmationLabel: "CLOVER · HARBOR", createdAt: now, approvalExpiresAt: future, viewExpiresAt: status === "approved" ? future : null, status, importId: status === "approved" ? importId : null, scope: "one_source_snapshot_read_only" }; }
function fileFixture(path: string): SourceFileView { const content = path === "alpha.ts" ? ALPHA : BETA; return { importId, snapshotId: snapshot.id, path, content, hash: digest(content), bytes: Buffer.byteLength(content) }; }
function json(data: unknown) { return new Response(JSON.stringify({ data, requestId: "controlled-source-dom" }), { headers: { "content-type": "application/json" } }); }
function denied() { return new Response(JSON.stringify({ error: { code: "SOURCE_ACCESS_DENIED", message: "This source snapshot is outside the current approved scope.", recoverable: false }, requestId: "controlled-source-denial" }), { status: 404, headers: { "content-type": "application/json" } }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
type Call = { path: string; method: string; body: Record<string, unknown> | null; signal: AbortSignal | null };
interface Server { index: SourceWorkspaceIndex; view: SourceWorkspaceView; workspace: WorkspaceDTO; connection: SourceBrowserConnection; handle?: (call: Call) => Promise<Response> | Response | undefined }
function RefreshScope() { const { refresh } = useWorkspace(); return createElement("button", { onClick: () => void refresh(), "data-test": "refresh-scope" }, "Refresh browser scope"); }
async function mounted(t: TestContext, options: { ready?: boolean; strict?: boolean; server?: Partial<Server> } = {}) {
  document.body.innerHTML = "<div id='root'></div>"; window.history.replaceState(null, "", "/sources"); window.sessionStorage.clear();
  const server: Server = { index: indexFixture(options.ready ?? true), view: viewFixture(), workspace: structuredClone(workspace), connection: connectionFixture(), ...options.server };
  const calls: Call[] = [], originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const call: Call = { path: String(input), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null, signal: init?.signal ?? null }; calls.push(call);
    const custom = server.handle?.(call); if (custom) return custom;
    if (call.path === "/api/workspace" || call.path === "/api/source-workspaces/session") return json(server.workspace);
    if (call.path === "/api/source-workspaces") return json(server.index);
    if (call.path === "/api/source-workspaces/connections" && call.method === "POST") return json({ ...server.connection, requestId: call.body?.requestId });
    if (call.path === `/api/source-workspaces/connections/${connectionId}`) return json(call.method === "DELETE" ? { ...server.connection, status: "cancelled" } : server.connection);
    if (call.path === `/api/source-workspaces/${importId}`) return json(server.view);
    if (call.path.startsWith(`/api/source-workspaces/${importId}/files?`)) { const params = new URL(call.path, "http://localhost").searchParams; const file = fileFixture(params.get("path")!); assert.equal(params.get("hash"), file.hash); return json(file); }
    throw new Error("Unexpected Source Atlas network request: " + call.method + " " + call.path);
  };
  const root = createRoot(document.getElementById("root")!);
  const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "source-component-test" };
  const content = createElement(AppRouterContext.Provider, { value: router }, createElement(PathnameContext.Provider, { value: "/sources" }, createElement(WorkspaceProvider, null, createElement(SourceAtlas), createElement(RefreshScope))));
  t.after(async () => { await act(async () => root.unmount()); globalThis.fetch = originalFetch; });
  await act(async () => root.render(options.strict ? createElement(StrictMode, null, content) : content));
  return { server, calls };
}
async function until(check: () => boolean, timeout = 2500) { const end = Date.now() + timeout; while (!check()) { if (Date.now() > end) assert.fail("Source component state did not settle"); await act(async () => { await new Promise(done => setTimeout(done, 15)); }); } }
function button(label: string): HTMLButtonElement { const node = [...document.querySelectorAll("button")].find(item => item.getAttribute("aria-label") === label || item.textContent?.trim() === label); assert.ok(node, "Mounted source button: " + label); return node; }
async function click(node: HTMLElement) { await act(async () => { node.focus(); node.click(); }); }
function inspector() { const node = document.querySelector<HTMLElement>('aside[aria-label="Exact source inspector"]'); assert.ok(node); return node; }
function sourceVisible(text: string) { return document.querySelector('aside[aria-label="Exact source inspector"] pre')?.textContent?.includes(text) === true; }
function graphNode(path: string) { const node = [...document.querySelectorAll<HTMLButtonElement>("button[aria-label]")].find(item => item.getAttribute("aria-label")?.startsWith("Provider operation:") && item.getAttribute("aria-label")?.includes(path)); assert.ok(node, "Actual cited graph node: " + path); return node; }
function tab(label: string) { const node = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(item => item.textContent?.replace(/\d+$/, "").trim() === label); assert.ok(node, "Source detail tab: " + label); return node; }

test("loading establishes a source-only scope and empty approval never seeds a purchase", async t => {
  const scope = deferred<Response>();
  t.after(async () => { await act(async () => scope.resolve(json(workspace))); });
  const view = await mounted(t, { ready: false, server: { handle: call => call.path === "/api/workspace" ? new Response("{}", { status: 401 }) : call.path === "/api/source-workspaces/session" ? scope.promise : undefined } });
  assert.match(document.body.textContent!, /private source (?:scope|workspace)/i);
  assert.doesNotMatch(document.body.textContent!, /Loading the saved sample session/);
  await act(async () => scope.resolve(json(workspace)));
  await until(() => document.body.textContent?.includes("Keep the evidence.") === true);
  await click(button("Connect a source snapshot"));
  await until(() => document.body.textContent?.includes("CLOVER · HARBOR") === true);
  const requests = view.calls.filter(call => call.method === "POST"); assert.equal(requests.length, 2);
  assert.equal(requests[0]!.path, "/api/source-workspaces/session"); assert.equal(requests[1]!.path, "/api/source-workspaces/connections");
  assert.match(String(requests[1]!.body?.requestId), /^[a-f0-9-]{36}$/);
  assert.equal(view.calls.some(call => /judge\/sessions|\/api\/runs|api-m\./.test(call.path)), false);
  assert.match(document.body.textContent!, /approve_source_view/); assert.match(document.body.textContent!, /<chosen import id>/);
});

test("an approved exact snapshot reveals only hash-verified file text and stays static", async t => {
  const view = await mounted(t, { ready: false }); await until(() => document.body.textContent?.includes("Keep the evidence.") === true);
  await click(button("Connect source")); await until(() => document.body.textContent?.includes("CLOVER · HARBOR") === true);
  view.server.connection = connectionFixture("approved"); view.server.index = indexFixture();
  await click(button("Check approval")); await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT"));
  assert.match(inspector().textContent!, /Hash matched/); assert.match(document.body.textContent!, /0 application commands/);
  assert.match(document.body.textContent!, /Runtime evidence is still required/); assert.equal(view.calls.some(call => /\/api\/runs|api-m\./.test(call.path)), false);
  assert.ok(view.calls.some(call => call.path.includes(`/files?path=alpha.ts&hash=${digest(ALPHA)}`)));
});

test("unacknowledged approval setup retries the same request identity", async t => {
  let attempts = 0;
  const view = await mounted(t, { ready: false, server: { handle: call => { if (call.path.endsWith("/connections") && call.method === "POST" && ++attempts === 1) throw new TypeError("Controlled challenge acknowledgement loss"); return undefined; } } });
  await until(() => document.body.textContent?.includes("Keep the evidence.") === true); await click(button("Connect source"));
  await until(() => document.body.textContent?.includes("Controlled challenge acknowledgement loss") === true);
  await click(button("Retry connection")); await until(() => document.body.textContent?.includes("CLOVER · HARBOR") === true);
  const requests = view.calls.filter(call => call.path.endsWith("/connections") && call.method === "POST"); assert.equal(requests.length, 2); assert.deepEqual(requests[0]!.body, requests[1]!.body);
});

test("revoked metadata scope purges source while retaining the last verified map", async t => {
  let revoked = false;
  const view = await mounted(t, { server: { handle: call => revoked && call.path === `/api/source-workspaces/${importId}` ? denied() : undefined } });
  await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT")); revoked = true;
  await click(button("Refresh")); await until(() => document.body.textContent?.includes("Private source reads are locked.") === true);
  assert.equal(document.body.textContent!.includes("SOURCE_ALPHA_PRIVATE_TEXT"), false); assert.match(document.body.textContent!, /Controlled source checkout/);
  assert.match(document.body.textContent!, /POST PayPal capture/); assert.match(document.body.textContent!, /SOURCE_ACCESS_DENIED/);
  const fileReads = view.calls.filter(call => call.path.includes("/files?")).length;
  await click(graphNode("beta.ts")); await act(async () => { await new Promise(done => setTimeout(done, 30)); });
  assert.equal(view.calls.filter(call => call.path.includes("/files?")).length, fileReads, "Denied scope does not attempt new source reads");
});

test("a denied file response locks the inspector without exposing returned source", async t => {
  await mounted(t, { server: { handle: call => call.path.includes("/files?") ? denied() : undefined } });
  await until(() => document.body.textContent?.includes("Private source reads are locked.") === true);
  assert.equal(document.body.textContent!.includes("SOURCE_ALPHA_PRIVATE_TEXT"), false); assert.match(inspector().textContent!, /Read scope is closed/);
});

test("late file responses cannot replace the newly selected source even when transport ignores abort", async t => {
  const alpha = deferred<Response>();
  const view = await mounted(t, { server: { handle: call => call.path.includes("/files?path=alpha.ts") ? alpha.promise : undefined } });
  await until(() => view.calls.some(call => call.path.includes("/files?path=alpha.ts")));
  await click(graphNode("beta.ts")); await until(() => sourceVisible("SOURCE_BETA_PRIVATE_TEXT"));
  const oldCall = view.calls.find(call => call.path.includes("/files?path=alpha.ts"))!; assert.equal(oldCall.signal?.aborted, true);
  await act(async () => alpha.resolve(json(fileFixture("alpha.ts"))));
  assert.equal(sourceVisible("SOURCE_BETA_PRIVATE_TEXT"), true); assert.equal(document.body.textContent!.includes("SOURCE_ALPHA_PRIVATE_TEXT"), false);
});

test("a file hash failure displays the integrity error and never renders poisoned bytes", async t => {
  const poisoned = "POISONED_PRIVATE_SOURCE_MUST_NOT_RENDER";
  await mounted(t, { server: { handle: call => call.path.includes("/files?") ? json({ ...fileFixture("alpha.ts"), content: poisoned, bytes: Buffer.byteLength(poisoned) }) : undefined } });
  await until(() => document.body.textContent?.includes("SOURCE_FILE_HASH_MISMATCH") === true);
  assert.equal(document.body.textContent!.includes(poisoned), false); assert.doesNotMatch(inspector().textContent!, /Hash matched/);
  assert.match(document.body.textContent!, /Controlled source checkout/);
});

test("graph selection focuses the exact inspector and detail tabs support arrow-key navigation", async t => {
  await mounted(t); await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT"));
  await click(graphNode("beta.ts")); await until(() => sourceVisible("SOURCE_BETA_PRIVATE_TEXT"));
  const heading = inspector().querySelector("h3")!; await until(() => document.activeElement === heading); assert.equal(heading.textContent, "beta.ts");
  const findingsTab = tab("Findings"); findingsTab.focus();
  await act(async () => findingsTab.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  assert.equal(document.activeElement, tab("Files")); assert.equal(tab("Files").getAttribute("aria-selected"), "true");
  assert.match(document.querySelector('[role="tabpanel"]')!.textContent!, /Exact accepted bytes/);
});

test("new interrupted checks stay visible without refreshing the earlier unchanged observation", async t => {
  const baseline = viewFixture();
  const body = { schemaVersion: "fracture.source-changes/v1" as const, snapshotId: snapshot.id, baselineRevisionHash: snapshot.revisionHash, currentRevisionHash: snapshot.revisionHash, checkedAt: "2026-11-12T09:00:00.000Z", unchanged: true, changes: [], exclusionsChanged: false };
  const receipt: SourceChangeReceipt = { ...body, receiptHash: objectHash(body) };
  baseline.latestChanges = receipt; baseline.changeChecks = [
    { id: randomUUID(), requestId: randomUUID(), createdAt: "2026-11-12T10:00:00.000Z", status: "interrupted", errorCode: "SOURCE_SECRET_DETECTED", receipt: null },
    { id: randomUUID(), requestId: randomUUID(), createdAt: body.checkedAt, status: "ready", errorCode: null, receipt },
  ];
  await mounted(t, { server: { view: baseline } }); await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT")); await click(tab("Source changes"));
  const panel = document.querySelector('[role="tabpanel"]')!;
  assert.match(panel.textContent!, /LAST COMPLETED OBSERVATION/); assert.match(panel.textContent!, /newer source check was interrupted/);
  assert.match(panel.textContent!, /SOURCE_SECRET_DETECTED/); assert.match(panel.textContent!, /newer incomplete check does not refresh this observation/);
  assert.equal(baseline.latestChanges.checkedAt, body.checkedAt); assert.equal(baseline.latestChanges.receiptHash, receipt.receiptHash);
  assert.equal(panel.querySelector<HTMLDetailsElement>("details")?.open, true);
});

test("a changed browser session clears old private source instead of reusing component state", async t => {
  const view = await mounted(t); await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT"));
  view.server.workspace = { ...workspace, sessionId: randomUUID() }; view.server.index = indexFixture(false);
  await click(button("Refresh browser scope")); await until(() => document.body.textContent?.includes("Keep the evidence.") === true);
  assert.equal(document.body.textContent!.includes("SOURCE_ALPHA_PRIVATE_TEXT"), false); assert.equal(document.querySelector('aside[aria-label="Exact source inspector"]'), null);
});

test("strict mounting does not strand the initial source read behind an aborted request", async t => {
  const view = await mounted(t, { strict: true }); await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT"));
  assert.ok(view.calls.some(call => call.path === "/api/source-workspaces")); assert.match(inspector().textContent!, /Hash matched/);
});

test("export checksum failure blocks the download and retains the selected source", async t => {
  const exported: SourceSnapshotExport = { schemaVersion: "fracture.source-export/v1", exportedAt: now, view: viewFixture(), files: [fileFixture("alpha.ts"), fileFixture("beta.ts")], execution: { applicationCommands: 0, modelCalls: 0, paymentProviderCalls: 0, runtimeObserved: false }, contentHash: "0".repeat(64) };
  await mounted(t, { server: { handle: call => call.path.endsWith("/export") ? new Response(JSON.stringify(exported), { headers: { "content-type": "application/json", "x-content-sha256": exported.contentHash } }) : undefined } });
  await until(() => sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT")); await click(button("Export snapshot"));
  await until(() => document.body.textContent?.includes("SOURCE_EXPORT_HASH_MISMATCH") === true);
  assert.equal(document.querySelector("a[download]"), null); assert.equal(sourceVisible("SOURCE_ALPHA_PRIVATE_TEXT"), true);
});
