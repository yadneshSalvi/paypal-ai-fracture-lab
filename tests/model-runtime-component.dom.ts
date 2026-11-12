import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { act, createElement } from "react";
import type { RuntimeAttempt, RuntimeView } from "../packages/ai/src/runtime-view";

register("./helpers/css-module-loader.mjs", import.meta.url);
const { JSDOM } = createRequire(new URL("./component-runtime/package.json", import.meta.url))("jsdom") as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/ai-workbench", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "Event", "MouseEvent", "KeyboardEvent", "Node"] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { RuntimeEvidence } = await import("../apps/web/components/model-runtime");

const attempt: RuntimeAttempt = { id: "original-attempt", runId: "original-run", role: "diagnosis_conclusion", provider: "OpenAI", model: "gpt-6-astra", status: "completed", startedAt: "2026-11-12T10:00:00Z", durationMs: 4100, errorCode: null, responseId: "resp_original", evidenceId: "original-evidence", inputHash: "a".repeat(64), requestHash: "b".repeat(64), inputTokens: 100, outputTokens: 50, background: false, continuationFrom: "original-tool-selection", privateContextStored: true, retainedOutputItems: 2, transport: { phase: "consumer_cancelled", httpStatus: 200, endpoint: "https://api.openai.com/v1/responses", requestId: "req_original", durationMs: 4100, responseBytes: 2000, responseSha256: null, nativeCodes: [], headersTimeoutMs: 900000, bodyTimeoutMs: 900000, node: "v22.22.3", dispatcher: "7.30.2" } };
const data: RuntimeView = { schemaVersion: 1, sessionId: "test-session", observedAt: "2026-11-12T10:00:10Z", attempts: [attempt], reads: [], totalAttempts: 1, truncated: false };
const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent?.includes(name))!;

test("mounted workbench covers loading, empty, read recovery and original evidence selection", async t => {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!);
  t.after(async () => { await act(async () => root.unmount()); });
  let refreshes = 0; const opened: string[] = [];
  const render = async (value: RuntimeView | null, loading = false, error: string | null = null) => act(async () => root.render(createElement(RuntimeEvidence, { data: value, loading, error, onRefresh: () => { refreshes++; }, onEvidence: id => { opened.push(id); } })));
  await render(null, true);
  assert.match(document.body.textContent!, /Reading the original attempts/);
  assert.equal(button("Refresh records").disabled, true);
  await render({ ...data, attempts: [], totalAttempts: 0 });
  assert.match(document.body.textContent!, /Your first investigation starts with a witness/);
  await render(data);
  await act(async () => button("Conclude from the actual receipt").click());
  assert.equal(document.activeElement?.id, "model-attempt-title");
  await act(async () => button("Open model receipt").click());
  assert.deepEqual(opened, ["original-evidence"]);
  await render(data, false, "The connection is unavailable.");
  assert.match(document.querySelector('[role="alert"]')!.textContent!, /saved view below is retained/);
  assert.match(document.body.textContent!, /resp_original/);
  await act(async () => button("Refresh records").click()); assert.equal(refreshes, 1);
  assert.equal(opened.length, 1);
  await act(async () => button("Gemini").click());
  assert.match(document.body.textContent!, /No attempts from this provider/);
});

test("terminal polling preserves inspector focus and unknown outcomes remain explicit", async t => {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!);
  t.after(async () => { await act(async () => root.unmount()); });
  const render = async (row: RuntimeAttempt) => act(async () => root.render(createElement(RuntimeEvidence, { data: { ...data, attempts: [row] }, loading: false, error: null, onRefresh() {}, onEvidence() {} })));
  await render({ ...attempt, status: "running", evidenceId: null });
  await act(async () => button("Conclude from the actual receipt").click());
  assert.equal(document.activeElement?.id, "model-attempt-title");
  await render({ ...attempt, status: "failed", evidenceId: null, errorCode: "MODEL_DISPATCH_UNKNOWN" });
  assert.equal(document.activeElement?.id, "model-attempt-title");
  assert.match(document.body.textContent!, /has not been automatically replaced/);
  assert.ok(!button("Open model receipt"));
  assert.equal(document.querySelector<HTMLAnchorElement>('a[href="/runs/original-run"]')?.textContent, "Original witness");
});
