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

test("mounted policy view shows ten conditions while retaining all sixteen original observations", async t => {
  document.body.innerHTML = "<div id='root'></div>";
  const root = createRoot(document.getElementById("root")!); t.after(async () => { await act(async () => root.unmount()); });
  const checks = fixture(), original = JSON.stringify(checks);
  await act(async () => root.render(createElement(RepairPolicyChecks, { checks })));
  assert.equal(document.querySelectorAll(".policy-check").length, 10);
  assert.match(document.querySelector(".policy-strip-heading")!.textContent!, /10\/10 conditions passed · 16 retained observations/);
  assert.equal(document.querySelectorAll("details li").length, 16);
  assert.equal(document.querySelectorAll('[aria-label="2 retained observations"]').length, 6);
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
  assert.match(document.querySelector(".policy-violation")!.textContent!, /Observations disagree.*failed policy observation remains blocking/);
  assert.equal(document.querySelectorAll("details li").length, 18);
  assert.ok(document.querySelector("details")!.textContent!.includes("other.ts:7"));
  assert.equal(JSON.stringify(checks), original);
});
