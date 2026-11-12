/** Mounted receipt-component fixtures only: no runtime, browser, provider, model or database calls. */
import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { act, createElement, StrictMode } from "react";
import type { SourceExecutionConnection, SourceExecutionIndex, SourceExecutionView } from "../packages/contracts/src/source-execution-view";
import { connection, digest, future, ids, indexOf, makeActive, makeView, seal } from "./source-executions-ui-fixtures/receipts";
register("./helpers/css-module-loader.mjs", import.meta.url);
const ordinaryRuntime = createRequire(new URL("./component-runtime/package.json", import.meta.url));
const isolatedRuntime = createRequire(new URL("./source-executions-ui-fixtures/package.json", import.meta.url));
let jsdomPath: string;
try { jsdomPath = ordinaryRuntime.resolve("jsdom"); } catch (error) { if ((error as { code?: string }).code !== "MODULE_NOT_FOUND") throw error; jsdomPath = isolatedRuntime.resolve("jsdom"); }
const { JSDOM } = ordinaryRuntime(jsdomPath) as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/source-executions", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "HTMLDialogElement", "HTMLInputElement", "HTMLSelectElement", "Event", "MouseEvent", "KeyboardEvent", "Node"] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const { createRoot } = await import("react-dom/client");
const { SourceExecutionPanel } = await import("../apps/web/components/source-executions");
const storage = "fracture:execution-view:v1:" + ids.session;
function json(data: unknown) { return new Response(JSON.stringify({ data, requestId: "controlled-ui-response" }), { headers: { "content-type": "application/json" } }); }
function denied(status = 403) { return new Response(JSON.stringify({ error: { code: "SOURCE_EXECUTION_VIEW_ACCESS_DENIED", message: "This separately approved receipt view has ended.", recoverable: false }, requestId: "controlled-denial" }), { status, headers: { "content-type": "application/json" } }); }
function raw(view: SourceExecutionView, header = view.contentHash) { return new Response(JSON.stringify(view), { headers: { "content-type": "application/json", "x-content-sha256": header } }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
type Call = { path: string; method: string; body: Record<string, unknown> | null; signal: AbortSignal | null };
type Server = { index: SourceExecutionIndex; view: SourceExecutionView; challenge: SourceExecutionConnection; handle?: (call: Call) => Response | Promise<Response> | undefined };
async function mounted(t: TestContext, options: { server?: Partial<Server>; preserveStorage?: boolean; fragment?: string; strict?: boolean } = {}) {
  document.body.innerHTML = "<div id='root'></div>"; window.history.replaceState(null, "", "/source-executions" + (options.fragment ?? "")); if (!options.preserveStorage) window.sessionStorage.clear();
  const server: Server = { view: makeView(), index: indexOf(makeView()), challenge: connection(), ...options.server }, calls: Call[] = [];
  const originalFetch = globalThis.fetch, originalInterval = window.setInterval, originalClear = window.clearInterval;
  let visible = "visible", timerId = 0; const timers = new Map<number, () => void>();
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visible });
  window.setInterval = ((handler: TimerHandler) => { const id = ++timerId; assert.equal(typeof handler, "function"); timers.set(id, handler as () => void); return id; }) as typeof window.setInterval;
  window.clearInterval = id => { if (typeof id === "number") timers.delete(id); };
  globalThis.fetch = async (input, init) => { const call: Call = { path: String(input), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null, signal: init?.signal ?? null }; calls.push(call); const custom = server.handle?.(call); if (custom) return custom;
    if (call.path === "/api/source-executions") return json(server.index);
    if (call.path === "/api/source-executions/connections" && call.method === "POST") return json({ ...server.challenge, requestId: call.body?.requestId, requestedJobId: call.body?.jobId });
    if (call.path.startsWith("/api/source-executions/connections?requestId=")) return json({ ...server.challenge, requestId: new URL(call.path, "http://localhost").searchParams.get("requestId") });
    if (call.path === `/api/source-executions/connections/${ids.connection}`) return json(call.method === "DELETE" ? { ...server.challenge, status: "cancelled" } : server.challenge);
    if (call.path === `/api/source-executions/${server.view.job.id}`) return json(server.view);
    if (call.path === `/api/source-executions/${server.view.job.id}/export`) return raw(server.view);
    throw new Error("Unexpected component request: " + call.method + " " + call.path);
  };
  const root = createRoot(document.getElementById("root")!); let closed = false;
  async function unmount() { if (closed) return; closed = true; await act(async () => root.unmount()); globalThis.fetch = originalFetch; window.setInterval = originalInterval; window.clearInterval = originalClear; }
  t.after(unmount);
  await act(async () => root.render(options.strict ? createElement(StrictMode, null, createElement(SourceExecutionPanel, { sessionId: ids.session })) : createElement(SourceExecutionPanel, { sessionId: ids.session })));
  return { server, calls, timers, unmount, visible: (next: string) => { visible = next; }, poll: async () => { const current = [...timers.values()]; await act(async () => { current.forEach(callback => callback()); await new Promise(done => setTimeout(done, 5)); }); } };
}
async function until(check: () => boolean, timeout = 2000) { const end = Date.now() + timeout; while (!check()) { if (Date.now() >= end) assert.fail("Mounted execution receipt state did not settle"); await act(async () => { await new Promise(done => setTimeout(done, 10)); }); } }
const body = () => document.body.textContent ?? "";
function button(label: string) { const node = [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.getAttribute("aria-label") === label || item.textContent?.trim() === label); assert.ok(node, "Mounted button: " + label); return node; }
async function click(node: HTMLElement) { await act(async () => { node.focus(); node.click(); }); }
async function typeJob(value = ids.job) { const input = document.querySelector<HTMLInputElement>("#receipt-job-id"); assert.ok(input); await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); }
async function ready() { await until(() => body().includes("Content hash verified")); }
function caseButton(name: string) { const node = [...document.querySelectorAll<HTMLButtonElement>('aside[aria-label="Execution cases"] button')].find(item => item.textContent?.includes(name)); assert.ok(node, "Actual case button: " + name); return node; }

test("component doubles: loading resolves to hash-verified DTO, exact assertions, source manifest and terminal no-poll", async t => {
  const pending = deferred<Response>(); const view = await mounted(t, { server: { handle: call => call.path === "/api/source-executions" ? pending.promise : undefined } });
  assert.match(body(), /Reading saved execution receipts/); assert.equal(view.calls.some(call => call.method !== "GET"), false);
  await act(async () => pending.resolve(json(indexOf(makeView())))); await ready();
  assert.match(body(), /9 \/ 9 cases finished/); assert.equal(document.querySelectorAll('section[aria-label="Selected case result"] li').length, 8); assert.equal(view.timers.size, 0);
  await click(button("Source files 3")); assert.match(body(), /checkout\/purchase\.ts/); assert.match(body(), /8,428 B/); assert.doesNotMatch(body(), /export async function/);
  assert.equal(view.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: case selection persists bounded fragment, focuses H3 and receipt Escape restores exact opener", async t => {
  const fixture = await mounted(t); await ready(); await click(caseButton("Lost response"));
  await until(() => document.activeElement?.tagName === "H3"); assert.equal(document.activeElement?.textContent, "Lost response");
  const selectedId = fixture.server.view.cases[1]!.id; assert.equal(new URLSearchParams(window.location.hash.slice(1)).get("case"), selectedId);
  const opener = button("Inspect case receipt"); await click(opener); const dialog = document.querySelector<HTMLDialogElement>("dialog"); assert.ok(dialog?.open);
  assert.equal(document.activeElement === button("Close receipt inspector"), true, "Dialog close button receives focus");
  await act(async () => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); assert.equal(document.querySelector("dialog") === null, true, "Dialog must be removed"); assert.equal(document.activeElement === opener, true, "Focus must equal the exact opener");
  await fixture.unmount(); const again = await mounted(t, { fragment: `#job=${ids.job}&case=${selectedId}`, preserveStorage: true }); await ready(); assert.equal(caseButton("Lost response").getAttribute("aria-pressed"), "true"); assert.equal(again.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: active polling is GET-only, hidden pages pause, terminal transition stops and polling preserves focus", async t => {
  const active = makeActive(), fixture = await mounted(t, { server: { view: active, index: indexOf(active) } }); await ready(); assert.equal(fixture.timers.size, 1);
  const opener = button("Inspect exact identities"); opener.focus(); const before = fixture.calls.length; fixture.visible("hidden"); await fixture.poll(); assert.equal(fixture.calls.length, before);
  fixture.visible("visible"); await fixture.poll(); assert.ok(fixture.calls.length > before); assert.equal(document.activeElement === opener, true, "Focus must equal the exact opener");
  fixture.server.view = makeView(); await fixture.poll(); await until(() => fixture.timers.size === 0); assert.match(body(), /Terminal saved state/); assert.equal(fixture.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: transient and corrupt reads retain only last verified state with stale warning", async t => {
  const fixture = await mounted(t); await ready(); fixture.server.handle = call => call.path === `/api/source-executions/${ids.job}` ? Promise.reject(new TypeError("Controlled outage")) : undefined;
  await click(button("Refresh saved state")); await until(() => body().includes("Showing the last hash-verified receipt")); assert.match(body(), /Controlled checkout \/ corrected/);
  fixture.server.handle = call => call.path === `/api/source-executions/${ids.job}` ? json({ ...makeView(), contentHash: digest("tampered") }) : undefined;
  await click(button("Refresh saved state")); await until(() => body().includes("Receipt identity did not match")); assert.match(body(), /Showing the last hash-verified receipt/); assert.equal(document.querySelectorAll('section[aria-label="Selected case result"] li').length, 8);
});

test("component doubles: denied access clears private receipt content and stops active polling", async t => {
  const active = makeActive(), fixture = await mounted(t, { server: { view: active, index: indexOf(active) } }); await ready(); await click(button("Inspect case receipt")); assert.match(body(), /PRIVATE_RECEIPT_SENTINEL/);
  fixture.server.handle = call => call.path === `/api/source-executions/${ids.job}` ? denied() : undefined; await fixture.poll(); await until(() => body().includes("Receipt content is unavailable")); assert.doesNotMatch(body(), /PRIVATE_RECEIPT_SENTINEL/); assert.equal(document.querySelector("dialog") === null, true, "Dialog must be removed"); assert.equal(fixture.timers.size, 0);
});

test("component doubles: unauthenticated index offers explicit session link and never admits one", async t => {
  const fixture = await mounted(t, { server: { handle: () => denied(401) } }); await until(() => body().includes("Open a private workspace first")); assert.equal(document.querySelector<HTMLAnchorElement>('a[href="/sources"]')?.textContent?.trim(), "Open source workspaces"); assert.equal(fixture.calls.length, 1); assert.equal(fixture.calls[0]!.method, "GET");
});

test("component doubles: unknown challenge acknowledgement retains original UUID through reload and GET-first recovery", async t => {
  const first = await mounted(t, { server: { index: indexOf(null), handle: call => call.method === "POST" ? Promise.reject(new TypeError("Controlled lost acknowledgement")) : undefined } });
  await until(() => body().includes("Bring the execution")); await click(button("Connect a job receipt")); await typeJob(); await click(button("Create read-only challenge")); await until(() => body().includes("acknowledgement is unknown"));
  const original = JSON.parse(window.sessionStorage.getItem(storage)!); assert.match(original.requestId, /^[a-f0-9-]{36}$/); const posts = first.calls.filter(call => call.method === "POST"); assert.equal(posts.length, 1); assert.equal(posts[0]!.body?.requestId, original.requestId); await first.unmount();
  const second = await mounted(t, { preserveStorage: true, server: { index: indexOf(null) } }); await until(() => body().includes("Recover this exact view request")); await click(button("Recover saved view request")); await until(() => body().includes("VIOLET · COMPASS"));
  assert.ok(second.calls.some(call => call.path === `/api/source-executions/connections?requestId=${original.requestId}`)); assert.equal(second.calls.some(call => call.method === "POST"), false); const recovered = JSON.parse(window.sessionStorage.getItem(storage)!); assert.equal(recovered.requestId, original.requestId); assert.equal(recovered.approvalRequestId, original.approvalRequestId); assert.match(body(), new RegExp(original.approvalRequestId));
});

test("component doubles: acknowledged challenge command remains stable on reload, clipboard fallback and approval changes focus", async t => {
  const fixture = await mounted(t, { server: { index: indexOf(null) } }); await until(() => body().includes("Bring the execution")); await click(button("Connect a job receipt")); await typeJob(); await click(button("Create read-only challenge")); await until(() => body().includes("VIOLET · COMPASS"));
  const saved = JSON.parse(window.sessionStorage.getItem(storage)!); await click(button("Copy approval command")); await until(() => body().includes("Clipboard unavailable")); const field = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Approval command for manual copy"]'); assert.ok(field); assert.equal(document.activeElement === field, true, "Focus must equal the exact field"); assert.match(field.value, new RegExp(saved.approvalRequestId));
  fixture.server.challenge = connection("approved", saved.requestId); fixture.server.index = indexOf(fixture.server.view); await click(button("Check approval")); await ready(); await until(() => document.activeElement?.tagName === "H2"); assert.equal(fixture.calls.filter(call => call.method === "POST").length, 1);
  await fixture.unmount(); const next = await mounted(t, { preserveStorage: true, server: { challenge: connection("approved", saved.requestId) } }); await ready(); await until(() => body().includes("VIOLET · COMPASS")); assert.equal(JSON.parse(window.sessionStorage.getItem(storage)!).approvalRequestId, saved.approvalRequestId); assert.equal(next.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: withheld receipt stays inconclusive despite eight internal passes and exact cloud boundary is readable", async t => {
  const value = makeView("vercel-sandbox"); value.job.status = "inconclusive"; value.cases[0]!.status = "inconclusive"; value.cases[0]!.receipt!.kind = "late_receipt_withheld"; value.job.cases = { ...value.job.cases, passed: 8, inconclusive: 1 }; seal(value);
  await mounted(t, { server: { view: value, index: indexOf(value) } }); await ready(); assert.match(body(), /Receipt withheld/); assert.match(body(), /Pass · withheld/); assert.match(body(), /saved case remains inconclusive/); await click(button("Inspect case receipt")); assert.match(body(), /Root writable · reference read-only/); assert.match(body(), /UID 1001/); assert.match(body(), /Stopped · nonresuming disposal/); assert.equal(document.querySelector("script") === null, true, "No script element is created"); assert.match(body(), /<script>unsafe_markup_must_be_text<\/script>/);
});

test("component doubles: export failure is visible, no successful download on changed or mismatched receipt", async t => {
  const fixture = await mounted(t); await ready(); const originalCreate = URL.createObjectURL; let downloads = 0; URL.createObjectURL = () => { downloads++; return "blob:controlled"; }; t.after(() => { URL.createObjectURL = originalCreate; });
  fixture.server.handle = call => call.path.endsWith("/export") ? Promise.reject(new TypeError("Controlled export outage")) : undefined; await click(button("Export private receipt")); await until(() => body().includes("Controlled export outage")); assert.equal(downloads, 0);
  const changed = makeView(); changed.events[0]!.detail = "Changed saved event"; seal(changed); fixture.server.handle = call => call.path.endsWith("/export") ? raw(changed) : undefined; await click(button("Export private receipt")); await until(() => body().includes("Saved state changed or the export hash")); assert.equal(downloads, 0);
});

test("component doubles: fixed view expiry clears open inspector and no further polling is admitted", async t => {
  const value = makeActive(); value.authority.expiresAt = new Date(Date.now() + 250).toISOString(); seal(value); const fixture = await mounted(t, { server: { view: value, index: indexOf(value) } }); await ready(); await click(button("Inspect case receipt")); assert.match(body(), /PRIVATE_RECEIPT_SENTINEL/); await until(() => body().includes("deadline has passed")); assert.doesNotMatch(body(), /PRIVATE_RECEIPT_SENTINEL/); assert.equal(fixture.timers.size, 0); const before = fixture.calls.length; await fixture.poll(); assert.equal(fixture.calls.length, before);
});

test("component doubles: compiler rejection has no invented assertions and strict mounting never creates a challenge", async t => {
  const value = makeView(); value.job.status = "failed"; value.cases[0]!.status = "compiler_rejected"; const receipt = value.cases[0]!.receipt!; receipt.status = "compiler_rejected"; receipt.compiler.status = "rejected"; receipt.compiler.diagnostics = "TS2322: Controlled incompatible type"; receipt.compiler.diagnosticsHash = digest(receipt.compiler.diagnostics); receipt.assertions = []; seal(value);
  const fixture = await mounted(t, { strict: true, server: { view: value, index: indexOf(value) } }); await ready(); assert.match(body(), /No assertion result was published/); assert.match(body(), /0 \/ 8 recorded/); await click(button("Inspect case receipt")); assert.match(body(), /TS2322/); assert.equal(fixture.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: modal traps Tab in both directions and file paths never become executable markup", async t => {
  const value = makeView(); value.plan.files[0]!.path = "checkout/<img src=x onerror=alert(1)>.ts"; seal(value); await mounted(t, { server: { view: value, index: indexOf(value) } }); await ready();
  await click(button("Inspect case receipt")); const dialog = document.querySelector<HTMLDialogElement>("dialog")!; const first = button("Close receipt inspector"), last = [...dialog.querySelectorAll<HTMLElement>("button, summary")].at(-1)!;
  await act(async () => { last.focus(); last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })); }); assert.equal(document.activeElement === first, true, "Focus must equal the exact first");
  await act(async () => first.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }))); assert.equal(document.activeElement === last, true, "Focus must equal the exact last");
  await click(first); await click(button("Source files 3")); assert.equal(document.querySelector("img") === null, true, "No image element is created"); assert.match(body(), /<img src=x onerror=alert\(1\)>\.ts/);
});

test("component doubles: a late result from a deselected job is fenced and the new job heading receives focus", async t => {
  const initial = makeView(), other = makeView(); other.job.id = ids.secondJob; other.job.title = "Controlled second checkout"; seal(other); const pending = deferred<Response>(); const index = indexOf(initial); index.jobs.push(indexOf(other).jobs[0]!);
  const fixture = await mounted(t, { server: { index, handle: call => call.path === `/api/source-executions/${ids.job}` ? pending.promise : call.path === `/api/source-executions/${ids.secondJob}` ? json(other) : undefined } });
  await until(() => document.querySelector("#execution-job") !== null); const selector = document.querySelector<HTMLSelectElement>("#execution-job")!;
  await act(async () => { selector.value = ids.secondJob; selector.dispatchEvent(new Event("change", { bubbles: true })); }); await ready(); await until(() => document.activeElement?.textContent === "Controlled second checkout"); assert.equal(fixture.calls.find(call => call.path === `/api/source-executions/${ids.job}`)?.signal?.aborted, true);
  await act(async () => pending.resolve(json(initial))); assert.equal(document.querySelector('section[aria-label="Selected execution"] h2')?.textContent, "Controlled second checkout"); assert.equal(new URLSearchParams(window.location.hash.slice(1)).get("job"), ids.secondJob);
});

test("component doubles: cancelling a view has an unknown acknowledgement until its original connection is read, never cancelling the job", async t => {
  const fixture = await mounted(t, { server: { index: indexOf(null) } }); await until(() => body().includes("Bring the execution")); await click(button("Connect a job receipt")); await typeJob(); await click(button("Create read-only challenge")); await until(() => body().includes("VIOLET · COMPASS")); const saved = JSON.parse(window.sessionStorage.getItem(storage)!);
  fixture.server.handle = call => call.method === "DELETE" ? Promise.reject(new TypeError("Controlled cancellation ack loss")) : undefined; await click(button("Cancel this view only")); await until(() => body().includes("View cancellation acknowledgement is unknown")); assert.equal(fixture.calls.filter(call => call.method === "DELETE").length, 1);
  fixture.server.challenge = connection("cancelled", saved.requestId); await click(button("Check approval")); await until(() => body().includes("This read-only view is cancelled")); assert.equal(fixture.calls.filter(call => call.method === "DELETE").length, 1); assert.equal(fixture.calls.some(call => /\/jobs\/|\/actions|cancel_source_execution|approve_source_execution(?!_view)/.test(call.path)), false); assert.equal(JSON.parse(window.sessionStorage.getItem(storage)!).requestId, saved.requestId);
});

test("component doubles: unreadable initial data and corrupt recovery storage never invent a receipt or a replacement request", async t => {
  window.sessionStorage.setItem(storage, '{"version":1,"requestId":"lost"}'); const fixture = await mounted(t, { preserveStorage: true, server: { index: indexOf(null), handle: call => call.path === "/api/source-executions" ? new Response("<html>controlled unavailable</html>", { headers: { "content-type": "text/html" } }) : undefined } }); await until(() => body().includes("saved view request is unreadable")); await until(() => body().includes("unreadable response")); assert.equal(document.querySelector('section[aria-label="Selected execution"]') === null, true, "No execution receipt is rendered"); assert.equal(button("Connect a job receipt").disabled, true); assert.equal(fixture.calls.some(call => call.method !== "GET"), false);
});

test("component doubles: no-case job states its empty denominator without inventing assertion outcomes", async t => {
  const value = makeView(); value.job.status = "inconclusive"; value.job.cases = { total: 0, passed: 0, failed: 0, pending: 0, dispatched: 0, inconclusive: 0, cancelled: 0, rejected: 0 }; value.cases = []; value.plan.scenarioIds = []; seal(value); await mounted(t, { server: { view: value, index: indexOf(value) } }); await ready(); assert.match(body(), /0 \/ 0 cases finished/); assert.match(body(), /No cases to inspect/); assert.equal(document.querySelectorAll('section[aria-label="Selected case result"] li').length, 0);
});

test("component doubles: exact acknowledged export verifies body and header before preparing the private download", async t => {
  const fixture = await mounted(t); await ready(); const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL, originalClick = dom.window.HTMLAnchorElement.prototype.click; let captured: Blob | null = null, filename = "";
  URL.createObjectURL = value => { assert.ok(value instanceof Blob); captured = value; return "blob:controlled-exact-export"; }; URL.revokeObjectURL = () => {}; dom.window.HTMLAnchorElement.prototype.click = function () { filename = this.download; };
  t.after(() => { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; dom.window.HTMLAnchorElement.prototype.click = originalClick; });
  await click(button("Export private receipt")); await until(() => filename !== ""); assert.equal(filename, `fracture-execution-${ids.job}.json`); assert.ok(captured); const exported = JSON.parse(await (captured as Blob).text()); assert.equal(exported.contentHash, fixture.server.view.contentHash); assert.equal(exported.authority.execute, false); assert.equal(exported.authority.sourceContent, false); assert.equal(Object.hasOwn(exported.plan.files[0], "content"), false);
});

test("component doubles: an acknowledged challenge rejection is distinct from an unknown outcome and its original ID is retained", async t => {
  const fixture = await mounted(t, { server: { index: indexOf(null), handle: call => call.method === "POST" ? new Response(JSON.stringify({ error: { code: "SOURCE_EXECUTION_REQUEST_REFUSED", message: "Controlled request refused", recoverable: false }, requestId: "controlled" }), { status: 409, headers: { "content-type": "application/json" } }) : undefined } }); await until(() => body().includes("Bring the execution")); await click(button("Connect a job receipt")); await typeJob(); await click(button("Create read-only challenge")); await until(() => body().includes("view request was rejected")); assert.doesNotMatch(body(), /View request acknowledgement is unknown/); const saved = JSON.parse(window.sessionStorage.getItem(storage)!); assert.equal(fixture.calls.filter(call => call.method === "POST")[0]!.body?.requestId, saved.requestId); assert.equal(saved.outcome, "rejected"); await click(button("Close rejected view request")); assert.equal(window.sessionStorage.getItem(storage), null); assert.equal(fixture.calls.filter(call => call.method === "POST").length, 1);
});

test("component doubles: a mismatched export header cannot prepare a download", async t => {
  const fixture = await mounted(t); await ready(); fixture.server.handle = call => call.path.endsWith("/export") ? raw(fixture.server.view, digest("wrong-header")) : undefined; const originalCreate = URL.createObjectURL; let downloads = 0; URL.createObjectURL = () => { downloads++; return "blob:should-not-be-created"; }; t.after(() => { URL.createObjectURL = originalCreate; }); await click(button("Export private receipt")); await until(() => body().includes("Saved state changed or the export hash")); assert.equal(downloads, 0);
});

test("component doubles: an HTTP500 challenge acknowledgement remains unknown and cannot be discarded as a rejected request", async t => {
  const fixture = await mounted(t, { server: { index: indexOf(null), handle: call => call.method === "POST" ? new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Controlled write acknowledgement unknown", recoverable: false }, requestId: "controlled" }), { status: 500, headers: { "content-type": "application/json" } }) : undefined } }); await until(() => body().includes("Bring the execution")); await click(button("Connect a job receipt")); await typeJob(); await click(button("Create read-only challenge")); await until(() => body().includes("View request acknowledgement is unknown")); const saved = JSON.parse(window.sessionStorage.getItem(storage)!); assert.equal(Object.hasOwn(saved, "outcome"), false); assert.equal([...document.querySelectorAll("button")].some(node => node.textContent === "Close rejected view request"), false); assert.equal(fixture.calls.filter(call => call.method === "POST").length, 1);
});

test("component doubles: a correctly hashed refresh cannot silently change an immutable plan or source closure", async t => {
  const value = makeActive(), fixture = await mounted(t, { server: { view: value, index: indexOf(value) } }); await ready(); const originalRevision = fixture.server.view.plan.revisionHash; fixture.server.view = structuredClone(value); fixture.server.view.plan.closureHash = digest("different-sealed-closure"); seal(fixture.server.view); await fixture.poll(); await until(() => body().includes("saved execution identity changed")); assert.match(body(), /Showing the last hash-verified receipt/); await click(button("Inspect exact identities")); assert.match(body(), new RegExp(originalRevision)); assert.doesNotMatch(body(), new RegExp(fixture.server.view.plan.closureHash));
});
