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
