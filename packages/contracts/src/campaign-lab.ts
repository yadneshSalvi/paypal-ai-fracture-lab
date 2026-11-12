import type { InvariantDTO, Revision, Verdict } from "./index";

/** A bounded, credential-free experiment grammar. These are controlled local faults. */
export type FaultComponent = "lost_capture_answer" | "malformed_capture_answer" | "unavailable_reread" | "never_sent_auth" | "capture_pending" | "harness_denial" | "customer_retry";
export interface FaultRecipe {
  version: "fracture.recipe/v1";
  components: FaultComponent[];
}
export interface CampaignBinding {
  runtimeHash: string;
  files: { path: string; sha256: string }[];
  revisions: { revision: Revision; path: string; sha256: string }[];
  sdk: { package: "paypal"; version: "2.29.0"; commit: string; coreVersion: "0.2.2"; coreArchiveHash: string };
  context: { path: string; sha256: string }[];
}
export interface CampaignCaseSpec {
  id: string;
  ordinal: number;
  scenarioId: string;
  scenarioTitle: string;
  scenarioHash: string;
  revision: Revision;
  sourceHash: string;
  seed: string;
  runId: string;
  requestId: string;
  recipe: FaultRecipe | null;
  recipeHash: string;
}
export interface CampaignManifest {
  version: "fracture.campaign/v1";
  kind: "paired" | "single" | "minimization";
  projectId: "bramble";
  seed: string;
  source: "sample";
  binding: CampaignBinding;
  authorization?: { kind: "developer_grant"; grantIdHash: string; expiresAt: string };
  cases: CampaignCaseSpec[];
  parent: null | {
    campaignId: string;
    caseId: string;
    runId: string;
    runEvidenceHash: string;
    invariantId: string;
    invariantVersion: string;
    originalRecipe: FaultRecipe;
    originalRecipeHash: string;
  };
}
export type CampaignStatus = "queued" | "running" | "waiting" | "completed" | "cancelled" | "needs_attention" | "expired";
export type CampaignCaseStatus = "pending" | "running" | "completed" | "interrupted" | "cancelled" | "blocked";
export interface CampaignCaseResult {
  runId: string;
  stage: string;
  verdict: Verdict;
  capturedMinor: number;
  refundedMinor: number;
  captureCount: number;
  fulfillmentCount: number;
  currency: string;
  eventCount: number;
  sourceHash: string;
  scenarioHash: string;
  seed: string;
  evidenceHash: string;
  witnessEventIds: string[];
  checks: Pick<InvariantDTO, "id" | "name" | "version" | "verdict" | "reason" | "expected" | "observed" | "witnessEventIds">[];
  finishedAt: string;
}
export interface CampaignCaseDTO extends CampaignCaseSpec {
  status: CampaignCaseStatus;
  result: CampaignCaseResult | null;
  reason: string | null;
}
export interface CampaignEventDTO {
  sequence: number;
  at: string;
  kind: string;
  caseId: string | null;
  summary: string;
}
export interface DefectClusterDTO {
  id: string;
  title: string;
  invariantId: string;
  caseIds: string[];
  runIds: string[];
  witnessCount: number;
  explanation: string;
  cause: "symptom_group";
}
export interface ReductionCertificateDTO {
  status: "searching" | "verified" | "inconclusive";
  property: string;
  originalComponents: number;
  minimalComponents: number | null;
  chosenCaseId: string | null;
  controlCaseId: string | null;
  exploredSubsets: number;
  expectedSubsets: number;
  discardedCaseIds: string[];
  scope: string;
}
export interface CampaignLabDTO {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  status: CampaignStatus;
  reason: string | null;
  manifestHash: string;
  manifest: CampaignManifest;
  cases: CampaignCaseDTO[];
  events: CampaignEventDTO[];
  clusters: DefectClusterDTO[];
  reduction: ReductionCertificateDTO | null;
  counts: { planned: number; completed: number; interrupted: number; pending: number; pass: number; fail: number; inconclusive: number; blocked: number; notApplicable: number };
  activeRunId: string | null;
  workflowId: string | null;
}
export interface CampaignCreateInput {
  projectId: "bramble";
  scenarioIds: string[];
  revisions: Revision[];
  seed: string;
  requestId: string;
}
