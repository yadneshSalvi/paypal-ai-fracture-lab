import test from "node:test";
import type { TestContext } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire, register } from "node:module";
import { act, createElement } from "react";
import type { WorkspaceDTO } from "@fracture/contracts";
import type { CampaignCaseDTO, CampaignLabDTO, FaultComponent } from "../packages/contracts/src/campaign-lab";

register("./helpers/css-module-loader.mjs", import.meta.url);
const { JSDOM } = createRequire(new URL("./component-runtime/package.json", import.meta.url))("jsdom") as { JSDOM: new (html: string, options: { url: string; pretendToBeVisual: boolean }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/campaigns", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "HTMLDialogElement", "Event", "MouseEvent", "KeyboardEvent", "Node"] as const) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// jsdom does not implement the dialog top layer. Its asynchronous close event
// is represented explicitly so late modal focus restoration can beat an effect.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector<HTMLElement>("button, input, select")?.focus(); };
dom.window.HTMLDialogElement.prototype.close = function () {
  if (!this.open) return;
  this.open = false;
  queueMicrotask(() => this.dispatchEvent(new dom.window.Event("close")));
};

const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { PathnameContext } = await import("next/dist/shared/lib/hooks-client-context.shared-runtime.js");
const { WorkspaceProvider } = await import("../apps/web/components/workspace-provider");
const { CampaignLab } = await import("../apps/web/components/campaign-lab");

const hash = "a".repeat(64);
const sourceHash = "b".repeat(64);
const sessionId = randomUUID();
const components: FaultComponent[] = ["lost_capture_answer", "unavailable_reread", "customer_retry"];
const workspace: WorkspaceDTO = {
  version: "1.0", sessionId, createdAt: "2026-01-01T00:00:00.000Z", source: "sample",
  policy: { sandboxOnly: true, maxCaptures: 24, maxGrossMinor: 24000, currency: "USD", liveEnabled: false, reason: "Controlled DOM test" },
  projects: [{ id: "bramble", name: "Bramble Books", description: "DOM test fixture", language: "TypeScript", kind: "bookshop", sourceHash, source: "sample", suitePassed: 0, suiteTotal: 0, revisions: [], latestRunId: null, map: { nodes: [], edges: [], findings: [], limitations: [] } }],
  scenarios: ["S0", "S3", "S4", "S5", "S10", "A4"].map(id => ({ id, title: id, shortTitle: id, description: "Controlled DOM test", family: "Local", suite: "local", mode: "sample", faultSource: "local_fixture", trigger: "fixture", phase: "capture", invariantIds: ["I2"], fixtureIds: ["bramble"], available: true, gate: null, hash, estimatedSeconds: 1 })),
  runs: [], campaigns: [], repairs: [], providerFacts: [], contractRows: [], evaluations: [], evidence: [], selectedRunId: null, metrics: [], work: [],
  errand: { projectId: "errand", title: "Errand", summary: "Controlled DOM test", source: "sample", unprotectedOrderIds: [], hardenedOrderIds: [], chargeCount: 0, toolCalls: [], limitations: [] },
};

function campaign(status: CampaignLabDTO["status"] = "completed", title = "Saved paired campaign"): CampaignLabDTO {
  const cases: CampaignCaseDTO[] = (["faulty", "hardened"] as const).map((revision, ordinal) => {
    const runId = randomUUID();
    const spec = { id: randomUUID(), ordinal, scenarioId: "S3", scenarioTitle: "Now the reread is gone", scenarioHash: hash, revision, sourceHash, seed: "component:paired:01", runId, requestId: randomUUID(), recipe: { version: "fracture.recipe/v1" as const, components }, recipeHash: hash };
    return { ...spec, status: status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "pending", reason: null,
      result: status === "completed" ? { runId, stage: "completed", verdict: revision === "faulty" ? "fail" : "pass", capturedMinor: revision === "faulty" ? 4800 : 2400, refundedMinor: 0, captureCount: revision === "faulty" ? 2 : 1, fulfillmentCount: 1, currency: "USD", eventCount: 3, sourceHash, scenarioHash: hash, seed: spec.seed, evidenceHash: hash, witnessEventIds: ["fixture-event"], checks: [{ id: "I2", name: "At most one capture", version: "I2/v1", verdict: revision === "faulty" ? "fail" : "pass", reason: "Controlled DOM receipt", expected: "One capture", observed: revision === "faulty" ? "Two captures" : "One capture", witnessEventIds: ["fixture-event"] }], finishedAt: "2026-01-01T00:00:01.000Z" } : null };
  });
  return {
    id: randomUUID(), title, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:01.000Z", expiresAt: "2099-01-01T00:00:00.000Z", status, reason: null, manifestHash: hash,
    manifest: { version: "fracture.campaign/v1", kind: "paired", projectId: "bramble", seed: "component:paired:01", source: "sample", binding: { runtimeHash: hash, files: [], revisions: [{ revision: "faulty", path: "src/faulty.ts", sha256: sourceHash }, { revision: "hardened", path: "src/hardened.ts", sha256: sourceHash }], sdk: { package: "paypal", version: "2.29.0", commit: "fixture-commit", coreVersion: "0.2.2", coreArchiveHash: hash }, context: [] }, cases, parent: null },
    cases, events: [], clusters: [], reduction: null,
    counts: { planned: 2, completed: status === "completed" ? 2 : 0, interrupted: 0, pending: status === "queued" ? 2 : 0, pass: status === "completed" ? 1 : 0, fail: status === "completed" ? 1 : 0, inconclusive: 0, blocked: status === "cancelled" ? 2 : 0, notApplicable: 0 }, activeRunId: null, workflowId: null,
  };
}

function reduction(parent: CampaignLabDTO, completed: boolean): CampaignLabDTO {
  const result = campaign(completed ? "completed" : "queued", "Saved recipe reduction");
  result.manifest.kind = "minimization";
  result.manifest.parent = { campaignId: parent.id, caseId: parent.cases[0]!.id, runId: parent.cases[0]!.runId, runEvidenceHash: hash, invariantId: "I2", invariantVersion: "I2/v1", originalRecipe: { version: "fracture.recipe/v1", components }, originalRecipeHash: hash };
  result.cases = Array.from({ length: 8 }, (_, mask) => campaign(completed ? "completed" : "queued").cases.map(item => {
    item.ordinal = mask * 2 + item.ordinal;
    item.recipe = { version: "fracture.recipe/v1", components: components.filter((_, index) => mask & (1 << index)) };
    item.recipeHash = createHash("sha256").update("DOM fixture subset " + mask).digest("hex");
    if (item.result) {
      const verdict = item.revision === "faulty" && (mask === 5 || mask === 7) ? "fail" : "pass";
      item.result.verdict = verdict;
      item.result.checks[0]!.verdict = verdict;
      item.result.captureCount = verdict === "fail" ? 2 : 1;
      item.result.capturedMinor = item.result.captureCount * 2400;
    }
    return item;
  })).flat();
  result.manifest.cases = result.cases;
  result.counts = { ...result.counts, planned: 16, completed: completed ? 16 : 0, pending: completed ? 0 : 16, pass: completed ? 14 : 0, fail: completed ? 2 : 0 };
  result.reduction = { status: completed ? "verified" : "searching", property: "I2", originalComponents: 3, minimalComponents: completed ? 2 : null, chosenCaseId: completed ? result.cases[10]!.id : null, controlCaseId: completed ? result.cases[11]!.id : null, exploredSubsets: completed ? 8 : 0, expectedSubsets: 8, discardedCaseIds: completed ? result.cases.filter(item => item.revision === "faulty" && item.result?.verdict === "pass").map(item => item.id) : [], scope: "Controlled DOM fixture; domain execution is tested separately." };
  return result;
}

type Post = { path: string; payload: Record<string, unknown> };
async function mounted(t: TestContext, initial: CampaignLabDTO[], handle: (post: Post) => Promise<Response> | Response) {
  document.body.innerHTML = "<div id='root'></div>";
  window.history.replaceState(null, "", "/campaigns");
  window.sessionStorage.clear();
  const rows = new Map(initial.map(row => [row.id, row]));
  const posts: Post[] = [];
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    calls.push((init?.method ?? "GET") + " " + path);
    if (init?.method === "POST") {
      const post = { path, payload: JSON.parse(String(init.body)) as Record<string, unknown> };
      posts.push(post);
      return handle(post);
    }
    if (path === "/api/workspace") return json(workspace);
    if (path === "/api/campaign-lab") return json({ campaigns: [...rows.values()] });
    if (path.startsWith("/api/campaign-lab/")) {
      const row = rows.get(path.slice("/api/campaign-lab/".length));
      assert.ok(row, "Only known fixture campaign reads are permitted");
      return json(row);
    }
    throw new Error("Unexpected component network request: " + path);
  };
  const root = createRoot(document.getElementById("root")!);
  const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "component-test" };
  t.after(async () => { await act(async () => root.unmount()); globalThis.fetch = originalFetch; });
  try {
    await act(async () => root.render(createElement(AppRouterContext.Provider, { value: router }, createElement(PathnameContext.Provider, { value: "/campaigns" }, createElement(WorkspaceProvider, null, createElement(CampaignLab))))));
  } catch (error) {
    if (error instanceof AggregateError) throw new Error([...new Set(error.errors.map(item => item instanceof Error ? item.stack : String(item)))].join("\n"));
    throw error;
  }
  await until(() => !button("New campaign").disabled && !document.querySelector("[aria-busy='true']") || Boolean(document.querySelector("select#saved-campaign option[value]:not([value=''])")));
  return { rows, posts, calls };
}
function json(data: unknown) { return new Response(JSON.stringify({ data, requestId: "component-test" }), { headers: { "content-type": "application/json" } }); }
function ack(row: CampaignLabDTO, dispatch: "accepted" | "pending" | "not_required" = "accepted") { return json({ campaign: row, dispatch }); }
function button(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(node => node.getAttribute("aria-label") === label || node.textContent?.trim() === label);
  assert.ok(found, "Button is present: " + label);
  return found;
}
function heading(title: string) { const node = [...document.querySelectorAll("h2")].find(item => item.textContent === title); assert.ok(node, "Result heading is present: " + title); return node; }
async function click(node: HTMLElement) { await act(async () => { node.focus(); node.click(); }); }
async function until(check: () => boolean, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!check()) { if (Date.now() > end) assert.fail("Component state did not settle in time"); await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
}
async function submit() { await click(button("New campaign")); await click(button("Save & run campaign")); }

test("campaign commands move focus to the retained result, including a late modal close", async t => {
  const saved = campaign("completed");
  let resolve!: (value: Response) => void;
  const response = new Promise<Response>(done => { resolve = done; });
  const mountedView = await mounted(t, [], () => response);
  await submit();
  assert.equal(document.querySelector<HTMLDialogElement>("dialog[aria-labelledby='create-campaign-title']")?.open, true);
  assert.equal(mountedView.posts.length, 1);
  await act(async () => resolve(ack(saved)));
  await until(() => document.activeElement === heading(saved.title));
  assert.equal(document.querySelector<HTMLDialogElement>("dialog[aria-labelledby='create-campaign-title']")?.open, false);
  // The opener is enabled for an already-complete response. A late close event
  // must not restore it over the newly selected result heading.
  assert.equal(button("New campaign").disabled, false);
  await act(async () => { await new Promise(done => setTimeout(done, 20)); });
  assert.equal(document.activeElement, heading(saved.title));
});

test("reduction notice remains accurate after polling completes and polling does not steal focus", async t => {
  const parent = campaign();
  const queued = reduction(parent, false);
  const view = await mounted(t, [parent], () => ack(queued));
  view.rows.set(queued.id, queued);
  await click(button("Explore 8 subsets"));
  await until(() => document.activeElement === heading(queued.title));
  const completed = reduction(parent, true);
  completed.id = queued.id;
  completed.updatedAt = "2026-01-01T00:00:02.000Z";
  view.rows.set(completed.id, completed);
  const selector = document.querySelector<HTMLSelectElement>("#saved-campaign")!;
  selector.focus();
  await until(() => document.body.textContent?.includes("I2 witness verified") === true);
  const notice = [...document.querySelectorAll("[role='status']")].find(node => node.textContent?.includes("Reduction saved."));
  assert.ok(notice);
  assert.match(notice.textContent!, /Inspect the subset receipts and witness certificate below/);
  assert.doesNotMatch(notice.textContent!, /still being tested|in progress|currently running/i);
  assert.equal(document.activeElement, selector);
  assert.equal(view.posts.length, 1);
});

test("stopping removes its action button and focuses the saved campaign result", async t => {
  const queued = campaign("queued");
  const stopped = { ...queued, status: "cancelled" as const, updatedAt: "2026-01-01T00:00:02.000Z", cases: queued.cases.map(item => ({ ...item, status: "cancelled" as const })), counts: { ...queued.counts, pending: 0, blocked: 2 } };
  const view = await mounted(t, [queued], () => ack(stopped, "not_required"));
  await click(button("Stop campaign"));
  await until(() => document.activeElement === heading(queued.title));
  assert.equal([...document.querySelectorAll("button")].some(node => node.textContent?.trim() === "Stop campaign"), false);
  assert.equal(view.posts[0]?.payload.action, "cancel");
});

test("unconfirmed create focuses recovery; same-request recovery focuses the returned result", async t => {
  const saved = campaign();
  let attempts = 0;
  const view = await mounted(t, [], () => { if (++attempts === 1) throw new TypeError("Controlled acknowledgement loss"); return ack(saved, "not_required"); });
  await submit();
  await until(() => document.activeElement?.textContent === "The command outcome is unconfirmed.");
  assert.equal(document.querySelector<HTMLDialogElement>("dialog[aria-labelledby='create-campaign-title']")?.open, false);
  assert.ok(window.sessionStorage.getItem("fracture:campaign-command:v1:" + sessionId));
  await click(button("Retry same request"));
  await until(() => document.activeElement === heading(saved.title));
  assert.deepEqual(view.posts[0], view.posts[1], "Recovery retains the complete original request identity and payload");
  assert.equal(window.sessionStorage.getItem("fracture:campaign-command:v1:" + sessionId), null);
  assert.match(document.body.textContent!, /original saved command was recovered without reporting new execution/);
});

test("saved but unacknowledged dispatch focuses its recovery state", async t => {
  const saved = campaign("queued");
  const view = await mounted(t, [], () => ack(saved, "pending"));
  view.rows.set(saved.id, saved);
  await submit();
  await until(() => document.activeElement?.textContent === "Saved. Dispatch is still pending.");
  assert.ok(window.sessionStorage.getItem("fracture:campaign-command:v1:" + sessionId));
  assert.ok(heading(saved.title));
});

test("dismissing campaign setup without submission preserves ordinary opener focus", async t => {
  await mounted(t, [], () => { throw new Error("Closing setup must not submit a request"); });
  const opener = button("New campaign");
  await click(opener);
  await click(button("Close campaign setup"));
  await until(() => document.activeElement === opener);
});
