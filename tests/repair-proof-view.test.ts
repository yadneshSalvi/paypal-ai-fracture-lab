import test from "node:test";
import assert from "node:assert/strict";
import type { EvidenceDTO, RepairDTO, RunDTO } from "@fracture/contracts";
import { generatedTestView, publicRepairSuite, repairAuthorNotes, repairProofView } from "../packages/ai/src/repair-proof-view";
import { qrMatrix, qrSvgPath } from "../apps/web/app/reports/qr";
import { runReport, runReportHtml } from "../packages/ai/src/run-report";

// Controlled presentation fixtures; these tests make no provider or runner call.
function fixture(): EvidenceDTO {
  const ids = ["compile", "happy", "lost", "malformed", "unavailable", "pending", "auth", "concurrent", "revoked", "payload"];
  return {
    id: "proof-original", runId: "run-original", title: "Generated candidate · isolated verification", kind: "test", source: "sample",
    createdAt: "2026-11-12T12:36:28Z", sha256: "e".repeat(64), summary: "Legacy summary calls these local regressions.", redactions: [],
    body: { repairId: "repair-original", candidateHash: "a".repeat(64), result: {
      schemaVersion: 1, candidateHash: "a".repeat(64), suiteHash: publicRepairSuite, stage: "evaluated", passed: true,
      policy: [{ id: "unchanged-suite", passed: true }],
      tests: ids.map((id, index) => ({ id, name: `${id} check`, status: "pass", hidden: index > 1, durationMs: index })),
      runnerReceipt: { kind: "vercel_sandbox", snapshotId: "snap_fixture", snapshotHash: "b".repeat(64), image: "vercel/sandbox/node@sha256:" + "c".repeat(64),
        networkPolicy: "deny-all", referenceReadOnly: true, rootReadOnly: false, persistent: false, hostMountCount: 0, user: "candidate", credentialEnvironmentForwarded: false, disposalStatus: "stopped", source: "sample", elapsedMs: 6566 },
    } },
  };
}
type MutableResult = { suiteHash: string; candidateHash: string; passed: boolean; policy: { passed: boolean }[]; tests: { id: string; status: string; hidden: boolean }[]; runnerReceipt: Record<string, unknown> };
const result = (evidence: EvidenceDTO) => evidence.body.result as MutableResult;

test("public cloud presentation retains the original record, hash, flags and purchase verdict in both exports", () => {
  const evidence = fixture(), before = JSON.stringify(evidence), view = repairProofView(evidence)!;
  assert.equal(view.engine, "vercel_sandbox"); assert.equal(view.rootFilesystem, "Writable microVM root");
  assert.equal(view.passed, true); assert.equal(view.tests.length, 10); assert.equal(view.legacyHiddenFlags, 8);
  assert.ok(view.tests.every(item => item.hidden === false)); assert.equal(view.originalEvidenceSha256, evidence.sha256);
  const run = { id: "run-original", scenarioTitle: "Lost answer", source: "sample", revision: "faulty", verdict: "fail", summary: "Two captures remain recorded.", capturedMinor: 2400, currency: "USD", refundedMinor: 0, invariants: [] } as unknown as RunDTO;
  const report = runReport(run, [evidence], "2026-11-12T13:00:00Z"), encoded = JSON.parse(JSON.stringify(report));
  assert.equal(encoded.run.verdict, "fail"); assert.equal(encoded.verificationViews[0].passed, true);
  assert.deepEqual(encoded.evidence[0], JSON.parse(before)); assert.equal(JSON.stringify(evidence), before);
  const html = runReportHtml(report);
  assert.ok(html.includes("Vercel Sandbox")); assert.ok(html.includes("Writable microVM root"));
  assert.ok(html.includes("8 legacy hidden flags remain")); assert.ok(html.includes("sample · faulty · fail"));
  assert.equal(JSON.stringify(evidence), before);
});

test("local receipt does not invent a confirmed disposal or cloud lifecycle", () => {
  const evidence = fixture();
  result(evidence).runnerReceipt = { imageId: "sha256:" + "c".repeat(64), snapshotHash: "d".repeat(64), networkMode: "none", readOnlyRoot: true, hostMountCount: 0, user: "1000:1000", credentialEnvironmentForwarded: false, source: "sample", elapsedMs: 3301 };
  const view = repairProofView(evidence)!;
  assert.equal(view.engine, "local_docker"); assert.equal(view.snapshotId, null);
  assert.equal(view.rootFilesystem, "Read-only container root"); assert.equal(view.disposal, "Disposal is not recorded in this receipt");
});

test("unknown suites, changed candidate binding and unrecognized or unsafe runner boundaries receive no reinterpretation", () => {
  const mutations: ((evidence: EvidenceDTO) => void)[] = [
    e => { result(e).suiteHash = "f".repeat(64); }, e => { result(e).candidateHash = "d".repeat(64); },
    e => { result(e).runnerReceipt.networkPolicy = "allow-all"; }, e => { result(e).runnerReceipt.credentialEnvironmentForwarded = true; },
    e => { result(e).runnerReceipt.hostMountCount = 1; }, e => { result(e).runnerReceipt.disposalStatus = "running"; },
    e => { result(e).runnerReceipt = {}; }, e => { result(e).tests[1]!.id = "compile"; },
    e => { e.source = "provider" as EvidenceDTO["source"]; },
  ];
  for (const mutate of mutations) { const evidence = fixture(); mutate(evidence); const before = JSON.stringify(evidence); assert.equal(repairProofView(evidence), null); assert.equal(JSON.stringify(evidence), before); }
});

test("failed behavior, failed policy and incomplete denominators cannot become a verified result", () => {
  for (const mutate of [
    (r: MutableResult) => { r.tests[4]!.status = "fail"; }, (r: MutableResult) => { r.policy[0]!.passed = false; },
    (r: MutableResult) => { r.tests = r.tests.slice(0, 1); }, (r: MutableResult) => { r.passed = false; }, (r: MutableResult) => { r.policy = []; },
  ]) {
    const evidence = fixture(); mutate(result(evidence)); const view = repairProofView(evidence)!;
    assert.equal(view.passed, false); assert.match(view.summary, /Verification was not established/);
  }
});

test("authored notes and HTML-untrusted evidence survive without becoming active markup", () => {
  const evidence = fixture(); result(evidence).tests[0]!.id = "compile";
  evidence.summary = '<script>window.LEAK="private"</script>'; evidence.body.untrusted = '</pre><img src=x onerror=alert(1)>';
  const scope = "The exact generated source was tested against compilation and nine unchanged public regressions. This is not the 600-attempt study or hosted runner qualification.";
  const repair = { id: "repair-original", provenance: "model_generated", limitations: ["Author uncertainty remains.", scope] } as RepairDTO;
  const view = repairProofView(evidence)!;
  assert.deepEqual(repairAuthorNotes(repair, view), ["Author uncertainty remains."]);
  assert.deepEqual(repair.limitations, ["Author uncertainty remains.", scope]);
  assert.deepEqual(repairAuthorNotes({ ...repair, id: "other-repair" }, view), repair.limitations);
  const run = { id: "run-original", scenarioTitle: '<svg onload="alert(1)">', source: "sample", revision: "faulty", verdict: "fail", summary: evidence.summary, capturedMinor: 0, currency: "USD", refundedMinor: 0, invariants: [] } as unknown as RunDTO;
  const html = runReportHtml(runReport(run, [evidence]));
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("<img")); assert.ok(!html.includes("<svg"));
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(html.includes("&lt;img"));
});

// Controlled generated-test fixtures: shapes written by packages/service/src/generated-repairs.ts.
function generatedFixture(execution: Record<string, unknown> | null, executionError: string | null = null, createdAt = "2026-11-13T10:00:00Z"): EvidenceDTO {
  const test = { schemaVersion: 1, spec: { name: "Lost capture answer then retry charges once", rationale: "The witness shows two captures for one intent after a lost answer.", faults: { dropCaptureResponse: true, unavailableReread: false, authFailure: false, malformedSuccess: false, capturePending: false }, purchaseAttempts: 2, concurrent: false, expected: { completedCaptures: 1, entitlements: 1, customerState: "paid" } }, specHash: "1".repeat(64), author: { kind: "model", model: "fixture-model", modelEvidenceId: "model-evidence" }, baseHash: "2".repeat(64), candidateHash: "3".repeat(64) };
  return { id: `generated-${createdAt}-${execution ? "run" : executionError ? "error" : "authored"}`, runId: "run-original", title: "Generated regression test", kind: "test", source: "sample", createdAt, sha256: "4".repeat(64), summary: "fixture", redactions: [], body: { repairId: "repair-generated", generatedRegressionTest: test, execution, executionError } };
}
const executed = (before: string, after: string) => ({ schemaVersion: 1, specHash: "1".repeat(64), harnessHash: "5".repeat(64), baseHash: "2".repeat(64), candidateHash: "3".repeat(64), before, after, beforeDetail: "Observed 2 completed captures.", afterDetail: "Observed 1 completed captures.", established: before === "fail" && after === "pass", runnerReceipt: { imageId: "sha256:" + "c".repeat(64), networkMode: "none" } });

test("a generated test is labelled by author and execution, and only fail-before/pass-after is established", () => {
  const authored = generatedFixture(null), view = generatedTestView("repair-generated", [authored])!;
  assert.equal(view.state, "not_executed"); assert.equal(view.model, "fixture-model"); assert.equal(view.before, null); assert.equal(view.location, null);
  assert.deepEqual(view.given, ["The provider commits the capture, but its answer is lost"]); assert.match(view.when, /submitted 2 times$/); assert.ok(view.then.includes("Exactly 1 completed capture"));
  const ran = generatedFixture(executed("fail", "pass"), null, "2026-11-13T10:05:00Z"), established = generatedTestView("repair-generated", [authored, ran])!;
  assert.equal(established.state, "established"); assert.equal(established.location, "local Docker"); assert.equal(established.evidenceId, ran.id); assert.equal(established.scope, "additional_to_public_regressions");
  for (const [before, after] of [["pass", "pass"], ["fail", "fail"], ["not_reached", "pass"]] as const) assert.equal(generatedTestView("repair-generated", [authored, generatedFixture(executed(before, after), null, "2026-11-13T10:06:00Z")])!.state, "not_established");
  const failed = generatedTestView("repair-generated", [authored, generatedFixture(null, "CANDIDATE_TIMEOUT", "2026-11-13T10:07:00Z")])!;
  assert.equal(failed.state, "not_run"); assert.equal(failed.executionError, "CANDIDATE_TIMEOUT"); assert.equal(failed.before, null);
  // An execution bound to a different candidate or case is not presented as this test's result.
  const foreign = generatedFixture({ ...executed("fail", "pass"), candidateHash: "9".repeat(64) }, null, "2026-11-13T10:08:00Z");
  assert.equal(generatedTestView("repair-generated", [foreign])!.state, "not_executed");
});

test("earlier repairs without a generated test, and other repairs' records, yield no view; exports carry the view", () => {
  assert.equal(generatedTestView("repair-original", [fixture()]), null); assert.equal(generatedTestView("repair-original", [generatedFixture(executed("fail", "pass"))]), null); assert.equal(generatedTestView(undefined, []), null);
  const run = { id: "run-original", scenarioTitle: "Lost answer", source: "sample", revision: "faulty", verdict: "fail", summary: "Two captures.", capturedMinor: 2400, currency: "USD", refundedMinor: 0, invariants: [] } as unknown as RunDTO;
  assert.deepEqual(runReport(run, [fixture()]).generatedTestViews, []);
  const ran = generatedFixture(executed("fail", "pass")); (ran.body.generatedRegressionTest as { spec: { name: string } }).spec.name = "<img src=x onerror=alert(1)> lost answer";
  const report = runReport(run, [fixture(), ran]), html = runReportHtml(report);
  assert.equal(report.generatedTestViews.length, 1); assert.equal(report.verificationViews.length, 1);
  assert.ok(html.includes("Generated regression tests")); assert.ok(html.includes("fixture-model")); assert.ok(html.includes("Ran in isolation · local Docker")); assert.ok(!html.includes("<img"));
});

test("report link QR is a deterministic, structurally valid symbol and refuses oversized text", () => {
  const link = "https://paypal-ai-fracture-lab.vercel.app/reports/3f1c2a9e-7b64-4c1d-9a0e-5d2f8b7c6a41", matrix = qrMatrix(link)!;
  assert.equal(matrix.length, 41, "An 86-byte link needs version 6 at level M."); assert.ok(matrix.every(row => row.length === 41));
  const finder = (x: number, y: number) => { for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) { const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3)); assert.equal(matrix[y + dy]![x + dx], ring !== 2, `finder ${x},${y}`); } };
  finder(0, 0); finder(34, 0); finder(0, 34);
  for (let i = 8; i < 33; i++) { assert.equal(matrix[6]![i], i % 2 === 0); assert.equal(matrix[i]![6], i % 2 === 0); }
  assert.equal(matrix[33]![8], true, "dark module");
  assert.deepEqual(qrMatrix(link), matrix); assert.notDeepEqual(qrMatrix(link + "x"), matrix);
  const svg = qrSvgPath(matrix); assert.equal(svg.size, 49); assert.equal(svg.path.match(/M/g)!.length, matrix.flat().filter(Boolean).length);
  assert.equal(qrMatrix("a")!.length, 21); assert.equal(qrMatrix("x".repeat(180))!.length, 53); assert.equal(qrMatrix("x".repeat(181)), null);
});
