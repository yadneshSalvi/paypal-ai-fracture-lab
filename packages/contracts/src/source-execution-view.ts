/** Browser projection of a separately approved execution receipt. No imported source text or execution authority. */
import type { SourceCaseState, SourceJobState } from "../../source-execution/src/schemas";

export interface SourceExecutionConnection {
  id: string;
  requestId: string;
  requestedJobId: string;
  confirmationLabel: string;
  createdAt: string;
  approvalExpiresAt: string;
  viewExpiresAt: string | null;
  status: "pending" | "approved" | "cancelled" | "expired";
  jobId: string | null;
  scope: "one_source_execution_read_only";
}

export interface SourceExecutionSummary {
  id: string;
  planId: string;
  importId: string;
  title: string;
  entryPath: string;
  revisionHash: string;
  planHash: string;
  status: SourceJobState;
  createdAt: string;
  expiresAt: string;
  finishedAt: string | null;
  errorCode: string | null;
  runnerEngine: "docker" | "vercel-sandbox";
  cases: { total: number; passed: number; failed: number; pending: number; dispatched: number; inconclusive: number; cancelled: number; rejected: number };
}

export interface SourceExecutionIndex {
  jobs: SourceExecutionSummary[];
  connections: SourceExecutionConnection[];
  capabilities: { execution: "private_developer_approval"; view: "explicit_cli_approval"; provider: "controlled_sample_only"; sourceContent: false };
}

export interface SourceExecutionReceiptView {
  hash: string;
  status: string;
  kind: "executor_receipt" | "late_receipt_withheld";
  bundleHash: string;
  startedAt: string;
  finishedAt: string;
  compiler: { status: "passed" | "rejected" | "timeout" | "not_started"; version: string; diagnostics: string; diagnosticsHash: string };
  assertions: { id: string; passed: boolean }[];
  observation: Record<string, unknown> | null;
  observationHash: string;
  targetOutputHash: string;
  targetOutputBytes: number;
  isolation: {
    engine: "docker" | "vercel-sandbox";
    runnerId: string;
    configurationVerified: boolean;
    network: "none" | "deny_all";
    rootFilesystem: "read_only" | "writable";
    referenceFilesystem: "read_only";
    candidateUid: number;
    supervisorUid: 0;
    candidateCapabilities: "none";
    supervisorCapabilities: ["SETUID", "SETGID"];
    noNewPrivileges: true;
    credentialsForwarded: false;
    hostMounts: 0;
    deadlineMs: number;
    outputLimitBytes: number;
    memoryBytes: number;
    pidsLimit: number;
  };
  disposal: { state: "confirmed" | "unknown" | "not_created"; runtimeId: string | null; detail: string };
}

export interface SourceExecutionView {
  schema: "fracture.source-execution-view/v1";
  job: SourceExecutionSummary & { cancelledAt: string | null };
  plan: {
    id: string;
    planHash: string;
    importId: string;
    snapshotId: string;
    revisionHash: string;
    sourceManifestHash: string;
    closureHash: string;
    entryPath: string;
    exportName: "checkout";
    adapterVersion: string;
    adapterHash: string;
    suiteHash: string;
    scenarioManifestHash: string;
    seed: string;
    scenarioIds: string[];
    files: { path: string; hash: string; bytes: number }[];
    totalBytes: number;
    runner: { engine: "docker" | "vercel-sandbox"; id: string; snapshotHash: string; runnerHash: string; dependencyHash: string };
    limitations: string[];
  };
  cases: {
    id: string;
    scenarioId: string;
    status: SourceCaseState;
    executionId: string;
    dispatchedAt: string | null;
    finishedAt: string | null;
    errorCode: string | null;
    receipt: SourceExecutionReceiptView | null;
  }[];
  events: { id: string; sequence: number; at: string; kind: string; caseId: string | null; detail: string; digest: string }[];
  authority: { scope: "one_source_execution_read_only"; expiresAt: string; execute: false; sourceContent: false };
  originalImportExecution: "static_only";
  providerCalls: 0;
  modelCalls: 0;
  contentHash: string;
}
