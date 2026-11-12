import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { act, createElement } from "react";
import type { PolicyCheckDTO } from "@fracture/contracts";
register("./helpers/css-module-loader.mjs", import.meta.url);
const { JSDOM } = createRequire(new URL("./component-runtime/package.json", import.meta.url))("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/repairs", pretendToBeVisual: true });
for (const name of ["window", "self", "document", "navigator", "HTMLElement", "Event", "Node"] as const) Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { RepairPolicyChecks } = await import("../apps/web/components/repair-policy-checks");
const paired = ["single-file", "imports", "ambient", "reflection", "network", "store"];
function fixture(): PolicyCheckDTO[] {
  return [
    ...["test-integrity", "secret-boundary", "dependency-boundary", "error-integrity"].map(id => ({ id, name: id, passed: true, reason: `${id} boundary remains.` })),
    ...["isolation", "runner"].flatMap(prefix => paired.map(suffix => ({ id: `${prefix}-${suffix}`, name: `Bounded ${suffix}`, passed: true, reason: `The ${suffix} condition is checked.` }))),
  ];
}

test("mounted policy view shows ten real checks, plainly named, while retaining all sixteen recorded evaluations", async t => {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); t.after(async () => { await act(async () => root.unmount()); });
  const checks = fixture(), original = JSON.stringify(checks);
  await act(async () => root.render(createElement(RepairPolicyChecks, { checks })));
  assert.equal(document.querySelectorAll(".policy-check").length, 10);
  assert.match(document.querySelector(".policy-strip-heading")!.textContent!, /10\/10 checks passed · 16 recorded evaluations/);
  assert.equal(document.querySelectorAll("details li").length, 16);
  assert.equal(document.querySelectorAll('[aria-label="2 recorded evaluations"]').length, 6);
  const pills = [...document.querySelectorAll(".policy-check")].map(pill => pill.querySelector("span")!.firstChild!.textContent);
  assert.deepEqual(pills, ["Tests and assertions unchanged", "No secret reads or unapproved hosts", "No process, eval or dependency changes", "No swallowed errors", "One checkout file that parses", "Only pinned contract imports", "No process, global or eval access", "No prototype or computed-member access", "Only the PayPal sandbox host", "No schema-altering SQL"]);
  assert.ok(!document.body.textContent!.match(/hidden|tournament/i));
  assert.ok(document.querySelector("details")!.textContent!.includes("isolation-imports"));
  assert.ok(document.querySelector("details")!.textContent!.includes("runner-imports"));
  assert.equal(JSON.stringify(checks), original, "Grouping cannot rewrite saved policy records.");
});

test("disagreement remains failed and distinct identities or source spans never disappear", async t => {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); t.after(async () => { await act(async () => root.unmount()); });
  const checks = fixture(); checks.find(check => check.id === "runner-imports")!.passed = false;
  const unrelated = { ...checks.find(check => check.id === "runner-imports")!, id: "different-policy", passed: true };
  const otherSource = { ...checks.find(check => check.id === "runner-network")!, source: { path: "other.ts", line: 7, label: "A different source", hash: "a".repeat(64) } };
  checks.push(unrelated, otherSource); const original = JSON.stringify(checks);
  await act(async () => root.render(createElement(RepairPolicyChecks, { checks })));
  assert.equal(document.querySelectorAll(".policy-check").length, 12);
  assert.equal(document.querySelectorAll(".policy-check.fail").length, 1);
  assert.match(document.querySelector(".policy-violation")!.textContent!, /Evaluations disagree.*failed policy evaluation remains blocking/);
  assert.equal(document.querySelectorAll("details li").length, 18);
  assert.ok(document.querySelector("details")!.textContent!.includes("other.ts:7"));
  assert.equal(JSON.stringify(checks), original);
});

test("every catalogued pill maps to a check id the code emits, and an unknown id keeps its stored name", async t => {
  const { policyCheckCatalog } = await import("../apps/web/components/repair-policy-checks");
  const { inspectPatch } = await import("../packages/service/src/repairs"); const { inspectCandidate } = await import("../packages/isolation/src/policy");
  const emitted = [...inspectPatch("apps/fixtures/bramble/faulty.ts", []).map(check => check.id), ...inspectCandidate("export const a = 1;").map(check => check.id)];
  assert.deepEqual(Object.keys(policyCheckCatalog).sort(), [...emitted].sort());
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); t.after(async () => { await act(async () => root.unmount()); });
  await act(async () => root.render(createElement(RepairPolicyChecks, { checks: [{ id: "legacy-check", name: "Stored legacy name", passed: true, reason: "Kept as recorded." }, { id: "test-integrity", name: "Tests and assertions stay unchanged", passed: false, reason: "Candidate edits may not delete, relax, or rewrite the evaluator.", source: { path: "tests/application.test.ts", line: 1, label: "Edits a test file" } }] })));
  assert.match(document.querySelector(".patch-policy-strip")!.textContent!, /Stored legacy name/);
  assert.match(document.querySelector(".policy-violation")!.textContent!, /Tests and assertions unchanged — failed.*tests\/application\.test\.ts:1 · Edits a test file/);
});

test("generated test panel labels author and isolation, and earlier repairs read as complete without one", async t => {
  const { RepairGeneratedTest } = await import("../apps/web/components/repair-generated-test");
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); t.after(async () => { await act(async () => root.unmount()); });
  const view = { schemaVersion: 1 as const, evidenceId: "evidence-1", repairId: "repair-1", name: "Lost capture answer then retry charges once", rationale: "One intent produced two captures.", model: "fixture-model", specHash: "1".repeat(64), given: ["The provider commits the capture, but its answer is lost"], when: "The same purchase intent is submitted 2 times", then: ["Exactly 1 completed capture"], state: "established" as const, before: "fail" as const, after: "pass" as const, beforeDetail: "Observed 2 completed captures.", afterDetail: "Observed 1 completed captures.", location: "local Docker" as const, executionError: null, scope: "additional_to_public_regressions" as const };
  let opened = ""; await act(async () => root.render(createElement(RepairGeneratedTest, { view, modelGenerated: true, onOpenRecord: (id: string) => { opened = id; } })));
  const text = document.body.textContent!;
  assert.match(text, /generated by fixture-model/); assert.match(text, /ran in isolation · local Docker/); assert.match(text, /Before · faulty baselineFailed/); assert.match(text, /After · this candidatePassed/);
  assert.match(text, /Fail-before \/ pass-after established/); assert.match(text, /never replaces or edits them/);
  await act(async () => { (document.querySelector("footer button") as HTMLElement).click(); }); assert.equal(opened, "evidence-1");
  await act(async () => root.render(createElement(RepairGeneratedTest, { view: { ...view, state: "not_executed" as const, before: null, after: null, location: null }, modelGenerated: true })));
  assert.match(document.body.textContent!, /not executed yet/); assert.equal(document.querySelector('[role="group"]'), null);
  await act(async () => root.render(createElement(RepairGeneratedTest, { view: null, modelGenerated: true })));
  assert.match(document.body.textContent!, /predates generated regression tests/); assert.ok(!document.body.textContent!.match(/pending|error|undefined/i));
  await act(async () => root.render(createElement(RepairGeneratedTest, { view: null, modelGenerated: false })));
  assert.equal(document.getElementById("root")!.textContent, "");
});
