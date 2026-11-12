import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { RunDTO } from "../../contracts/src/index";
import type { CampaignCaseDTO, CampaignCaseResult, CampaignManifest, DefectClusterDTO, ReductionCertificateDTO } from "../../contracts/src/campaign-lab";

export function caseResult(run: RunDTO): CampaignCaseResult {
  const checks = run.invariants.map(({ id, name, version, verdict, reason, expected, observed, witnessEventIds }) => ({ id, name, version, verdict, reason, expected, observed, witnessEventIds }));
  const evidenceHash = sha256(canonicalJson({ source: run.source, sourceHash: run.sourceHash, scenarioHash: run.scenarioHash, seed: run.seed, events: run.events, captures: run.captures, refunds: run.refunds, checks, stage: run.stage }));
  return { runId: run.id, stage: run.stage, verdict: run.verdict, capturedMinor: run.capturedMinor, refundedMinor: run.refundedMinor, captureCount: run.captureCount, fulfillmentCount: run.fulfillmentCount, currency: run.currency, eventCount: run.events.length, sourceHash: run.sourceHash, scenarioHash: run.scenarioHash, seed: run.seed, evidenceHash, witnessEventIds: [...new Set(checks.filter(check => check.verdict === "fail").flatMap(check => check.witnessEventIds))], checks, finishedAt: run.updatedAt };
}
export function clusterSymptoms(cases: CampaignCaseDTO[]): DefectClusterDTO[] {
  const groups = new Map<string, DefectClusterDTO>();
  for (const item of cases.filter(item => item.status === "completed" && item.revision === "faulty")) {
    for (const check of item.result?.checks.filter(check => check.verdict === "fail") ?? []) {
      const group = groups.get(check.id) ?? { id: `symptom:${check.id}`, title: check.name, invariantId: check.id, caseIds: [], runIds: [], witnessCount: 0, explanation: "These runs violate the same measured property. A shared cause requires a discriminating replay; this grouping alone is not a causal diagnosis.", cause: "symptom_group" as const };
      group.caseIds.push(item.id); group.runIds.push(item.runId); group.witnessCount += check.witnessEventIds.length;
      groups.set(check.id, group);
    }
  }
  return [...groups.values()].sort((left, right) => right.caseIds.length - left.caseIds.length || left.invariantId.localeCompare(right.invariantId));
}
export function reductionCertificate(manifest: CampaignManifest, cases: CampaignCaseDTO[]): ReductionCertificateDTO | null {
  if (!manifest.parent) return null;
  const property = manifest.parent.invariantId;
  const baseline = cases.filter(item => item.revision === "faulty");
  const completed = baseline.filter(item => item.status === "completed");
  const reproducing = completed.filter(item => item.result?.checks.some(check => check.id === property && check.version === manifest.parent!.invariantVersion && check.verdict === "fail"));
  const chosen = [...reproducing].sort((left, right) => left.recipe!.components.length - right.recipe!.components.length || left.ordinal - right.ordinal)[0];
  const control = chosen ? cases.find(item => item.revision === "hardened" && item.recipeHash === chosen.recipeHash) : undefined;
  const sameProperty = control?.result?.checks.find(check => check.id === property && check.version === manifest.parent!.invariantVersion);
  const allFinished = cases.every(item => ["completed", "interrupted", "cancelled", "blocked"].includes(item.status));
  const valid = cases.every(item => item.status === "completed") && completed.length === baseline.length && Boolean(chosen) && control?.status === "completed" && sameProperty?.verdict === "pass";
  return {
    status: valid ? "verified" : allFinished ? "inconclusive" : "searching",
    property,
    originalComponents: manifest.parent.originalRecipe.components.length,
    minimalComponents: chosen?.recipe?.components.length ?? null,
    chosenCaseId: chosen?.id ?? null,
    controlCaseId: control?.id ?? null,
    exploredSubsets: completed.length,
    expectedSubsets: baseline.length,
    discardedCaseIds: completed.filter(item => !reproducing.some(candidate => candidate.id === item.id)).map(item => item.id),
    scope: valid ? "Smallest fault-component subset in this declared grammar and seed, retaining the selected invariant failure. Every subset was executed on the pinned baseline and control. This is not a globally minimal program or new provider evidence." : "Candidate witness only until every declared subset has completed on the pinned baseline and control and the matching control passes the selected property. Missing or interrupted cases cannot establish minimality.",
  };
}
