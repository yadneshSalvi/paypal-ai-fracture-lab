import test from "node:test";
import assert from "node:assert/strict";
import type { EvidenceDTO, RepairDTO, RunDTO } from "@fracture/contracts";
import { publicRepairSuite, repairAuthorNotes, repairProofView } from "../packages/ai/src/repair-proof-view";
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
