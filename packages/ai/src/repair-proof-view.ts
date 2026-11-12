import type { EvidenceDTO, RepairDTO } from "@fracture/contracts";

// This exact suite is shipped publicly. Legacy raw flags are retained, not treated
// as evidence that the candidate was evaluated against private held-out cases.
export const publicRepairSuite = "c3e3c478c3af78f82ba966e946cb578ef31b8a039855d920a65402adad190239";
const caseIds = ["compile", "happy", "lost", "malformed", "unavailable", "pending", "auth", "concurrent", "revoked", "payload"];
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const digest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export interface RepairProofView {
  schemaVersion: 1;
  evidenceId: string; originalEvidenceSha256: string; repairId: string;
  engine: "vercel_sandbox" | "local_docker";
  location: string; summary: string; passed: boolean;
  candidateHash: string; suiteHash: string; snapshotHash: string;
  snapshotId: string | null; image: string | null; user: string;
  network: "deny-all" | "none"; rootFilesystem: string; referenceFilesystem: string;
  disposal: string; elapsedMs: number | null;
  tests: { id: string; name: string; status: "pass" | "fail"; durationMs: number; hidden: false }[];
  legacyHiddenFlags: number;
  scope: "public_product_regressions";
  rawRecordModified: false;
}

/** Presentation only. No stored receipt, score, hidden flag or outcome is rewritten. */
export function repairProofView(evidence: EvidenceDTO | null | undefined): RepairProofView | null {
  if (!evidence || evidence.kind !== "test" || evidence.source !== "sample") return null;
  const body = object(evidence.body), result = object(body?.result), receipt = object(result?.runnerReceipt);
  if (!body || typeof body.repairId !== "string" || !result || result.schemaVersion !== 1 || !receipt || !digest(result.candidateHash) || result.suiteHash !== publicRepairSuite || !digest(receipt.snapshotHash) || !Array.isArray(result.tests) || !result.tests.length || result.tests.length > caseIds.length) return null;
  if (body.candidateHash !== result.candidateHash || receipt.source !== "sample" || receipt.hostMountCount !== 0 || receipt.credentialEnvironmentForwarded !== false) return null;
  const cloud = receipt.kind === "vercel_sandbox" && receipt.networkPolicy === "deny-all" && receipt.referenceReadOnly === true && receipt.rootReadOnly === false && receipt.persistent === false && receipt.user === "candidate" && typeof receipt.snapshotId === "string" && /^snap_[a-zA-Z0-9]+$/.test(receipt.snapshotId) && ["stopped", "failed", "aborted"].includes(String(receipt.disposalStatus));
  const local = receipt.kind === undefined && receipt.networkMode === "none" && receipt.readOnlyRoot === true && receipt.user === "1000:1000" && typeof receipt.imageId === "string" && /^sha256:[a-f0-9]{64}$/.test(receipt.imageId);
  if (!cloud && !local) return null;
  const tests: RepairProofView["tests"] = [];
  let legacyHiddenFlags = 0;
  for (const value of result.tests) {
    const test = object(value);
    if (!test || typeof test.id !== "string" || !caseIds.includes(test.id) || tests.some(prior => prior.id === test.id) || typeof test.name !== "string" || !["pass", "fail"].includes(String(test.status)) || typeof test.durationMs !== "number" || !Number.isFinite(test.durationMs) || test.durationMs < 0) return null;
    if (test.hidden === true) legacyHiddenFlags++;
    tests.push({ id: test.id, name: test.name, status: test.status as "pass" | "fail", durationMs: test.durationMs, hidden: false });
  }
  const location = cloud ? "Vercel Sandbox" : "local Docker";
  const passedCount = tests.filter(test => test.status === "pass").length;
  const passed = result.stage === "evaluated" && result.passed === true && tests.length === caseIds.length && passedCount === caseIds.length && Array.isArray(result.policy) && result.policy.length > 0 && result.policy.every(check => object(check)?.passed === true);
  return {
    schemaVersion: 1, evidenceId: evidence.id, originalEvidenceSha256: evidence.sha256, repairId: body.repairId,
    engine: cloud ? "vercel_sandbox" : "local_docker", location,
    summary: `${passedCount} of ${tests.length} public product checks passed in ${location}.${passed ? "" : " Verification was not established."}`, passed,
    candidateHash: result.candidateHash, suiteHash: publicRepairSuite, snapshotHash: receipt.snapshotHash,
    snapshotId: cloud ? String(receipt.snapshotId) : null,
    image: typeof (cloud ? receipt.image : receipt.imageId) === "string" ? String(cloud ? receipt.image : receipt.imageId) : null,
    user: String(receipt.user), network: cloud ? "deny-all" : "none",
    rootFilesystem: cloud ? "Writable microVM root" : "Read-only container root",
    referenceFilesystem: "Read-only pinned reference",
    disposal: cloud ? String(receipt.disposalStatus) : "Disposal is not recorded in this receipt",
    elapsedMs: typeof receipt.elapsedMs === "number" && Number.isFinite(receipt.elapsedMs) && receipt.elapsedMs >= 0 ? receipt.elapsedMs : null,
    tests, legacyHiddenFlags, scope: "public_product_regressions", rawRecordModified: false,
  };
}

export function repairAuthorNotes(repair: RepairDTO, view: RepairProofView | null): string[] {
  const notes = [...repair.limitations];
  const generatedScope = "The exact generated source was tested against compilation and nine unchanged public regressions. This is not the 600-attempt study or hosted runner qualification.";
  if (view?.repairId === repair.id && repair.provenance === "model_generated" && notes.at(-1) === generatedScope) notes.pop();
  return notes;
}

const faultText: Record<string, string> = { dropCaptureResponse: "The provider commits the capture, but its answer is lost", unavailableReread: "The reconciliation re-read is unavailable", authFailure: "Authentication fails before any payment request is sent", malformedSuccess: "A committed capture returns a malformed success body", capturePending: "The capture stays pending" };
type Side = "pass" | "fail" | "not_reached";
export interface GeneratedTestView {
  schemaVersion: 1; evidenceId: string; repairId: string;
  name: string; rationale: string; model: string; specHash: string;
  given: string[]; when: string; then: string[];
  /** established: failed on the faulty baseline and passed on the candidate in one isolated execution. */
  state: "established" | "not_established" | "not_run" | "not_executed";
  before: Side | null; after: Side | null; beforeDetail: string | null; afterDetail: string | null;
  location: "Vercel Sandbox" | "local Docker" | null; executionError: string | null;
  scope: "additional_to_public_regressions";
}

/** Presentation only. Picks the newest executed record for this repair, else the authored one. Repairs saved before generated tests existed return null. */
export function generatedTestView(repairId: string | undefined, evidence: readonly EvidenceDTO[] | undefined): GeneratedTestView | null {
  if (!repairId || !evidence) return null;
  const records = evidence.filter(item => item.kind === "test" && item.source === "sample" && object(item.body)?.repairId === repairId && object(object(item.body)?.generatedRegressionTest)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const chosen = records.find(item => object(item.body.execution) || typeof item.body.executionError === "string") ?? records[0];
  if (!chosen) return null;
  const test = object(chosen.body.generatedRegressionTest)!, spec = object(test.spec), author = object(test.author), expected = object(spec?.expected), faults = object(spec?.faults);
  if (!spec || !author || !expected || !faults || typeof spec.name !== "string" || typeof spec.rationale !== "string" || typeof author.model !== "string" || !digest(test.specHash) || !Number.isInteger(spec.purchaseAttempts) || !Number.isInteger(expected.completedCaptures) || !Number.isInteger(expected.entitlements) || typeof expected.customerState !== "string") return null;
  const injected = Object.keys(faultText).filter(key => faults[key] === true).map(key => faultText[key]!);
  const attempts = Number(spec.purchaseAttempts);
  const execution = object(chosen.body.execution);
  const sides = ["pass", "fail", "not_reached"];
  const valid = execution && sides.includes(String(execution.before)) && sides.includes(String(execution.after)) && execution.specHash === test.specHash && execution.candidateHash === test.candidateHash && execution.baseHash === test.baseHash;
  const receipt = valid ? object(execution.runnerReceipt) : null;
  const before = valid ? execution.before as Side : null, after = valid ? execution.after as Side : null;
  return {
    schemaVersion: 1, evidenceId: chosen.id, repairId, name: spec.name, rationale: spec.rationale, model: author.model, specHash: test.specHash as string,
    given: injected.length ? injected : ["No fault is injected"],
    when: `The same purchase intent is submitted ${attempts === 1 ? "once" : `${attempts} times`}${spec.concurrent === true && attempts > 1 ? ", concurrently" : ""}`,
    then: [`Exactly ${expected.completedCaptures} completed capture${expected.completedCaptures === 1 ? "" : "s"}`, `Exactly ${expected.entitlements} paid entitlement${expected.entitlements === 1 ? "" : "s"}`, ...(expected.customerState === "any" ? [] : [`The customer sees “${expected.customerState}”`]), "Gross captured never exceeds the 12.00 purchase", "An unknown outcome is never shown as failed", "No checkout call throws"],
    state: valid ? before === "fail" && after === "pass" ? "established" : "not_established" : typeof chosen.body.executionError === "string" ? "not_run" : "not_executed",
    before, after, beforeDetail: valid && typeof execution.beforeDetail === "string" ? execution.beforeDetail : null, afterDetail: valid && typeof execution.afterDetail === "string" ? execution.afterDetail : null,
    location: receipt ? receipt.kind === "vercel_sandbox" ? "Vercel Sandbox" : "local Docker" : null,
    executionError: !valid && typeof chosen.body.executionError === "string" ? chosen.body.executionError : null,
    scope: "additional_to_public_regressions",
  };
}
