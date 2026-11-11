/** Public DTOs. Only allowlisted, redacted values cross the API boundary. */
export type Provenance = "sample" | "live_sandbox" | "replay" | "modelled";
export type Verdict = "pass" | "fail" | "inconclusive" | "not_applicable" | "blocked";
export type Revision = "faulty" | "hardened";
export type RunStage = "created" | "preflight" | "provisioning" | "awaiting_approval" | "executing" | "observing" | "evaluating" | "completed" | "failed_infrastructure" | "cancelled_reconciled" | "cancelled_uncertain" | "inconclusive";
export type Lane = "customer" | "application" | "provider" | "lab";
export interface SourceRef { path: string; line: number; label: string; hash?: string }
export interface Money { currency: string; minor: number }
export interface ProjectDTO {
  id: string; name: string; description: string; language: "TypeScript" | "Python";
  kind: "bookshop" | "tickets" | "agent"; sourceHash: string;
  source: Provenance; suitePassed: number; suiteTotal: number;
  revisions: {id: Revision; label: string; sourceHash: string}[];
  latestRunId: string | null; map: IntegrationMapDTO;
}
export interface MapNode { id: string; label: string; kind: "intent"|"route"|"provider"|"store"|"fulfillment"; x: number; y: number; source: SourceRef; observed: boolean; risk?: string }
export interface MapEdge { id: string; from: string; to: string; label: string; observed: boolean; evidenceIds: string[] }
export interface MapFinding { id: string; title: string; severity: "risk"|"unverified"|"defect"|"info"; description: string; source: SourceRef; factId?: string }
export interface IntegrationMapDTO { nodes: MapNode[]; edges: MapEdge[]; findings: MapFinding[]; limitations: string[] }
export interface ScenarioDTO {
  id: string; title: string; shortTitle: string; description: string; family: string;
  suite: "local" | "live_resource" | "provider_negative" | "addition";
  mode: Provenance; faultSource: "local_fixture"|"local_proxy"|"provider_negative"|"authentic_replay";
  trigger: string; phase: string; invariantIds: string[]; fixtureIds: string[];
  available: boolean; gate: string | null; hash: string; estimatedSeconds: number;
}
export interface CaptureDTO { id: string; orderId: string; status: string; amountMinor: number; currency: string; observedAt: string; source: Provenance; evidenceId: string }
export interface RefundDTO { id: string; captureId: string; status: string; amountMinor: number; currency: string; observedAt: string; source: Provenance; evidenceId: string }
export type PhoneState = "ready"|"approving"|"processing"|"failed"|"checking"|"paid"|"refunded";
export interface KnowledgeProjection { phoneState: PhoneState; applicationStatus: string; providerStatus: string; capturedMinor: number; refundedMinor: number; captureCount: number; fulfillmentCount: number; currency: string }
export interface TraceEventDTO {
  id: string; runId: string; sequence: number; logicalClock: number; timestamp: string;
  offsetMs: number; lane: Lane; kind: string; title: string; detail: string;
  source: Provenance; evidenceIds: string[]; resourceId?: string; requestId?: string;
  identity: "absent" | "stable" | "changed" | "not_applicable";
  projection: KnowledgeProjection; sourceRef?: SourceRef;
}
export interface InvariantDTO {
  id: string; name: string; description: string; verdict: Verdict;
  reason: string; witnessEventIds: string[]; expected: string; observed: string;
  version: string; observationWindow: string;
}
export interface DiagnosisDTO {
  id: string; runId: string; status: "proposed"|"tested";
  hypotheses: {id: string; title: string; status: "possible"|"supported"|"eliminated"; reason: string}[];
  experiment: {title: string; tool: string; resourceId: string; observedStatus: string|null; receiptId: string|null};
  conclusion: string; model: string; source: Provenance;
}
export interface RunDTO {
  id: string; projectId: string; projectName: string; revision: Revision;
  sourceHash: string; scenarioId: string; scenarioTitle: string; scenarioHash: string; seed: string;
  stage: RunStage; verdict: Verdict; source: Provenance; faultSource: string;
  createdAt: string; updatedAt: string; durationMs: number; businessIntentId: string;
  amountMinor: number; currency: string; captureCount: number; capturedMinor: number; refundedMinor: number;
  fulfillmentCount: number; phoneState: PhoneState; applicationStatus: string; providerStatus: string;
  orderIds: string[]; captures: CaptureDTO[]; refunds: RefundDTO[]; events: TraceEventDTO[];
  invariants: InvariantDTO[]; diagnosis: DiagnosisDTO|null; repairIds: string[];
  comparisonRunId: string|null; remediation: "not_needed"|"approval_required"|"completed"|"pending";
  summary: string; limitations: string[]; nextAction: string;
}
export interface PolicyCheckDTO { id: string; name: string; passed: boolean; reason: string; source?: SourceRef }
export interface DiffLineDTO { line: number; type: "context"|"add"|"remove"; text: string; citationId?: string }
export interface RepairDTO {
  id: string; runId: string; title: string; candidate: "grounded"|"deceptive";
  provenance: "human_reference"|"seeded_policy_test"|"model_generated";
  status: "proposed"|"compiled"|"verified"|"rejected"; createdAt: string;
  summary: string; baseHash: string; diffHash: string; file: string; diff: DiffLineDTO[];
  policyChecks: PolicyCheckDTO[]; citations: {id:string; title:string; path:string; section:string; hash:string}[];
  tests: {id:string; name:string; status:"pass"|"fail"|"pending"; hidden:boolean; durationMs:number; detail:string}[];
  verificationRunId: string|null; source: Provenance; limitations: string[];
  verificationEvidenceId?: string;
}
export interface ContractRowDTO {
  id: string; category: "DUPLICATE CLAIMS"|"UNKNOWN OUTCOMES"|"CROSS-OPERATION INVARIANTS"|"OPTIONAL FIELDS"|"API REFUSAL";
  operation: string; requirement: string; mechanism: string; source: SourceRef; test: SourceRef;
  invariantId: string; scenarioId: string; status: "planned"|"bound"|"verified";
  testResult: string; sourceHash: string; verifiedAt: string|null;
}
export interface ProviderFactDTO {
  id: string; title: string; endpoint: string; method: string; sdkCommit: string;
  status: "docs_verified"|"supported_observation"|"contradicted_observation"|"inconclusive"|"not_tested";
  statement: string; limitation: string; scope: string; source: Provenance;
  observedAt: string|null; repetitions: number; requiredRepetitions: number;
  documentationUrl: string; evidenceIds: string[];
}
export interface EvidenceDTO {
  id: string; runId: string|null; title: string; kind: "trace"|"resource"|"test"|"source"|"contract"|"receipt"|"protocol";
  source: Provenance; createdAt: string; sha256: string;
  summary: string; body: Record<string,unknown>; redactions: string[]; sourceRef?: SourceRef;
}
export interface CampaignDTO {
  id: string; projectId: string; title: string; createdAt: string; revision: Revision;
  status: "running"|"completed"; caseIds: string[]; runIds: string[];
  results: {scenarioId:string; runId:string; verdict:Verdict; source:Provenance}[];
  counts: {pass:number;fail:number;inconclusive:number;blocked:number;not_applicable:number};
}
export interface EvaluationAttemptDTO { id:string; taskId:string; language:string; model:string; arm:"A"|"B"|"C"; repeat:number; heldOut:boolean; passed:boolean|null; status:"pending"|"completed"|"infrastructure_failure"; tokens:number; latencyMs:number; source:Provenance; evidenceId:string|null }
export interface EvaluationDTO {
  id: string; title: string; status: "protocol_draft"|"protocol_frozen"|"running"|"completed";
  protocolHash: string; plannedAttempts: number; completedAttempts: number; heldOutAttempts: number;
  families: string[]; arms: {id:"A"|"B"|"C";name:string;description:string}[];
  attempts: EvaluationAttemptDTO[]; models: string[]; limitations: string[];
}
export interface ErrandDTO {
  projectId: string; title: string; summary: string; source: Provenance;
  unprotectedOrderIds: string[]; hardenedOrderIds: string[]; chargeCount: number;
  toolCalls: {id:string; tool:string; transport:string; identity:"absent"|"stable"|"changed"|"forwarded"; status:string; orderId:string|null; detail:string; source:Provenance}[];
  limitations: string[];
}
export interface WorkspaceDTO {
  version: "1.0"; sessionId: string; createdAt: string; source: Provenance;
  policy: {sandboxOnly:boolean;maxCaptures:number;maxGrossMinor:number;currency:string;liveEnabled:boolean;reason:string};
  projects: ProjectDTO[]; scenarios: ScenarioDTO[]; runs: RunDTO[];
  campaigns: CampaignDTO[]; repairs: RepairDTO[]; providerFacts: ProviderFactDTO[];
  contractRows: ContractRowDTO[]; evaluations: EvaluationDTO[]; evidence: EvidenceDTO[]; errand: ErrandDTO;
  selectedRunId: string|null; metrics: {name:string;value:string;detail:string;source:Provenance}[];
  repairExecution?: "local_isolated" | "cloud_isolated" | "unavailable";
  work: {id:string;runId:string;kind:string;status:string;phase:string;startedAt:string}[];
}
export interface ApiEnvelope<T> { data:T; requestId:string; operationId?:string; status?:string }
export interface ApiFailure { error:{code:string;message:string;recoverable:boolean}; requestId:string }
