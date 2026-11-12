import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { act, createElement } from "react";
import type { ToolkitInvestigation } from "../packages/ai/src/investigations";
import type { InvestigationView } from "../packages/ai/src/investigation-view";

register("./helpers/css-module-loader.mjs", import.meta.url);
const { JSDOM } = createRequire(new URL("./component-runtime/package.json", import.meta.url))("jsdom") as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/ai-workbench", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "Event", "MouseEvent", "KeyboardEvent", "Node", "localStorage"] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { ToolkitInvestigationsPanel } = await import("../apps/web/components/toolkit-investigations");
const session = "actor-original", runId = "original-sample-run";
const witness = { id: runId, title: "Bramble Books", scenario: "A lost answer", sourceHash: "a".repeat(64), orderId: "SAMPLE-ORDER-ORIGINAL", captureCount: 2, capturedMinor: 2400, currency: "USD" };
const view = (owner = session): InvestigationView => ({ schemaVersion: 1, sessionId: owner, configured: true, model: "fixture-gemini", witnesses: [witness], reviews: [], recovered: null });
function review(status: ToolkitInvestigation["status"] = "queued", actionId = "original-request"): ToolkitInvestigation {
  const receiptIds = { selection: "selection-receipt", read: "read-receipt", conclusion: "conclusion-receipt", result: "result-receipt" };
  return { id: "original-investigation", runId, actionId, createdAt: "2026-11-12T10:00:00Z", updatedAt: "2026-11-12T10:00:00Z", status, phase: status === "completed" ? "completed" : "selection", witness: { ...witness, source: "sample" }, model: "fixture-gemini", errorCode: null, leaseUntil: status === "running" ? "2099-01-01T00:00:00Z" : null, workflowId: null, dispatchVersion: 0, receiptIds, availableReceiptIds: status === "completed" ? Object.values(receiptIds) : [], result: status === "completed" ? { evidenceId: receiptIds.result, conclusion: "The actual Sample read observed the original completed order.", observedOrderStatus: "COMPLETED", uncertainty: ["Controlled Sample evidence is not a live payment."], toolReceiptId: receiptIds.read, modelEvidenceIds: [receiptIds.selection, receiptIds.conclusion] } : null };
}
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.includes(text));
const response = (data: unknown) => Response.json({ data });
function gate<T>() { let release!: (value: T) => void; const promise = new Promise<T>(resolve => { release = resolve; }); return { promise, release }; }
async function mount(t: TestContext, owner = session) {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); const opened: string[] = []; let changes = 0;
  const render = async (next = owner) => act(async () => root.render(createElement(ToolkitInvestigationsPanel, { sessionId: next, onEvidence: id => { opened.push(id); }, onReceiptChange: () => { changes++; } })));
  await render();
  let closed = false;
  const close = async () => { if (!closed) { closed = true; await act(async () => root.unmount()); } };
  t.after(close);
  return { render, close, opened, changes: () => changes };
}
async function click(text: string) { assert.ok(button(text), `Missing button ${text}`); await act(async () => button(text)!.click()); }
async function submit() { await act(async () => document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }))); }

test("mounted panel uses reads only for loading, configuration absence, expired sessions and malformed responses", async t => {
  localStorage.clear(); let saved = view(); const calls: string[] = []; let failure: Response | null = null;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => { calls.push(init?.method ?? "GET"); return failure ?? response(saved); });
  await mount(t);
  assert.match(document.body.textContent!, /first receipt starts with your choice/);
  assert.equal(button("Ask Gemini to inspect")!.disabled, false);
  saved = { ...saved, configured: false }; await click("Read saved work");
  assert.equal(button("Ask Gemini to inspect")!.disabled, true);
  assert.match(document.body.textContent!, /Gemini is not configured here/);
  failure = Response.json({ error: { code: "SESSION_EXPIRED", message: "The original session expired." } }, { status: 401 });
  await click("Read saved work"); assert.match(document.querySelector('[role="alert"]')!.textContent!, /original session expired/);
  failure = response({ schemaVersion: 1, sessionId: session, configured: true, reviews: [{}], witnesses: [] });
  await click("Read saved work"); assert.match(document.body.textContent!, /saved investigations could not be read/);
  assert.ok(calls.every(method => method === "GET"));
});

test("double submission creates one intent; actual polling updates receipts without moving retained heading focus", async t => {
  localStorage.clear(); t.mock.timers.enable({ apis: ["setInterval"] });
  let saved = view(); const pending = gate<Response>(); let submitted: { requestId: string; runId: string } | null = null; const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    methods.push(init?.method ?? "GET");
    if (init?.method === "POST") { submitted = JSON.parse(String(init.body)); return pending.promise; }
    return response(saved);
  });
  const mounted = await mount(t);
  await act(async () => { const form = document.querySelector("form")!; form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
  assert.equal(methods.filter(method => method === "POST").length, 1); assert.ok(submitted);
  assert.ok(localStorage.getItem(`fracture:toolkit-intent:v1:${session}`));
  const submittedId = (submitted as unknown as { requestId: string }).requestId;
  const queued = review("queued", submittedId); saved = { ...saved, reviews: [queued] };
  await act(async () => { pending.release(response({ sessionId: session, review: queued, dispatch: "accepted" })); });
  assert.equal(document.activeElement?.id, "toolkit-review-title"); assert.equal(localStorage.getItem(`fracture:toolkit-intent:v1:${session}`), null);
  saved = { ...saved, reviews: [review("completed", submittedId)] };
  await act(async () => t.mock.timers.tick(5000));
  assert.match(document.body.textContent!, /actual Sample read observed/);
  assert.equal(document.activeElement?.id, "toolkit-review-title");
  assert.equal(methods.filter(method => method === "POST").length, 1);
  await click("Inspect original receipt"); assert.deepEqual(mounted.opened, ["selection-receipt"]);
});

test("unknown submission survives reload and exact-request lookup recovers it without another POST", async t => {
  localStorage.clear(); const saved = view(); let original: ToolkitInvestigation | null = null; let visible = false; let posts = 0; const reads: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    if (init?.method === "POST") { posts++; const body = JSON.parse(String(init.body)); original = review("queued", body.requestId); throw new TypeError("Controlled lost acknowledgement"); }
    reads.push(String(url)); return response({ ...saved, recovered: visible ? original : null });
  });
  const first = await mount(t); await submit();
  assert.equal(posts, 1); assert.match(document.body.textContent!, /Keep the original submission/);
  const intent = JSON.parse(localStorage.getItem(`fracture:toolkit-intent:v1:${session}`)!);
  await first.close(); visible = true; await mount(t);
  assert.equal(posts, 1); assert.ok(reads.some(url => url.includes(`requestId=${intent.requestId}`)));
  assert.equal(document.activeElement?.id, "toolkit-review-title");
  assert.equal(localStorage.getItem(`fracture:toolkit-intent:v1:${session}`), null);
  assert.match(document.body.textContent!, /original investigation was found/);
});

test("resume and stop keep original receipts, focus the result, and report export failure stays visible", async t => {
  localStorage.clear(); const waiting: ToolkitInvestigation = { ...review("waiting"), phase: "conclusion", availableReceiptIds: ["selection-receipt", "read-receipt"] };
  let saved = { ...view(), reviews: [waiting] }; const commands: Record<string, string>[] = [];
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    if (String(url).includes("/report?")) return Response.json({ error: { message: "Scoped export refused" } }, { status: 403 });
    if (init?.method === "POST") { const body = JSON.parse(String(init.body)); commands.push(body); const changed: ToolkitInvestigation = { ...saved.reviews[0]!, status: body.action === "cancel" ? "cancelled" : "running", leaseUntil: "2099-01-01T00:00:00Z" }; saved = { ...saved, reviews: [changed] }; return response({ sessionId: session, review: changed, dispatch: "accepted" }); }
    return response(saved);
  });
  await mount(t); await click("Continue saved work");
  assert.equal(document.activeElement?.id, "toolkit-review-title");
  await click("Stop investigation");
  assert.equal(document.activeElement?.id, "toolkit-review-title");
  assert.match(document.body.textContent!, /Stopped with earlier observations retained/);
  assert.equal([...document.querySelectorAll("button")].filter(node => node.textContent?.includes("Inspect original receipt")).length, 2);
  assert.deepEqual(commands.map(item => item.action), ["resume", "cancel"]);
  assert.equal(button("Continue saved work"), undefined); assert.equal(button("Stop investigation"), undefined);
  await click("HTML report"); assert.match(document.querySelector('[role="alert"]')!.textContent!, /report could not be downloaded/);
  assert.match(document.body.textContent!, /Stopped with earlier observations retained/);
});

test("a stale GET cannot overwrite an acknowledged create, even if its transport ignores abort", async t => {
  localStorage.clear(); let saved = view(), deferRead = false; const stale = gate<Response>(); let posts = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    if (init?.method === "POST") { posts++; const body = JSON.parse(String(init.body)); const created = review("queued", body.requestId); saved = { ...saved, reviews: [created] }; return response({ sessionId: session, review: created, dispatch: "accepted" }); }
    if (deferRead) { deferRead = false; return stale.promise; } return response(saved);
  });
  await mount(t); deferRead = true; await click("Read saved work"); await submit();
  assert.equal(document.activeElement?.id, "toolkit-review-title");
  await act(async () => stale.release(response(view())));
  assert.match(document.body.textContent!, /original-investigation/); assert.equal(posts, 1);
  assert.equal(document.activeElement?.id, "toolkit-review-title");
});

test("a late command from another session cannot publish into the new actor's panel", async t => {
  localStorage.clear(); let owner = session; const pending = gate<Response>(); let original: ToolkitInvestigation | null = null;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => { if (init?.method === "POST") { const body = JSON.parse(String(init.body)); original = review("queued", body.requestId); return pending.promise; } return response(view(owner)); });
  const mounted = await mount(t); await submit();
  owner = "actor-next"; await mounted.render(owner);
  await act(async () => pending.release(response({ sessionId: session, review: original, dispatch: "accepted" })));
  assert.doesNotMatch(document.body.textContent!, /original-investigation/);
  assert.equal(localStorage.getItem(`fracture:toolkit-intent:v1:${owner}`), null);
  assert.ok(localStorage.getItem(`fracture:toolkit-intent:v1:${session}`));
});
