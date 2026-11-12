import type { SourceChangeReceipt, SourceWorkspaceSnapshot } from "../../source-workspaces/src/types";

export type SourceImportStatus = "pending" | "ready" | "interrupted" | "rejected";
export interface SourceImportSummary {
  id: string;
  title: string;
  rootId: string;
  path: string;
  createdAt: string;
  expiresAt: string;
  status: SourceImportStatus;
  errorCode: string | null;
  snapshotId: string | null;
  revisionHash: string | null;
  files: number;
  bytes: number;
  findings: number;
  provenance: "authorized_source_snapshot";
  analysis: "static";
  runtimeObserved: false;
  access: "owner" | "approved_view";
}
export interface SourceWorkspaceView {
  import: SourceImportSummary;
  snapshot: SourceWorkspaceSnapshot | null;
  latestChanges: SourceChangeReceipt | null;
  changeChecks: { id: string; requestId: string; createdAt: string; status: "pending" | "ready" | "interrupted"; errorCode: string | null; receipt: SourceChangeReceipt | null }[];
  access: { readSource: boolean; executeSource: false; authorizePayments: false; expiresAt: string };
}
export interface SourceBrowserConnection {
  id: string;
  requestId: string;
  confirmationLabel: string;
  createdAt: string;
  approvalExpiresAt: string;
  viewExpiresAt: string | null;
  status: "pending" | "approved" | "expired" | "cancelled";
  importId: string | null;
  scope: "one_source_snapshot_read_only";
}
export interface SourceWorkspaceIndex {
  imports: SourceImportSummary[];
  connections: SourceBrowserConnection[];
  capabilities: {
    browserImport: false;
    browserExecution: false;
    localImport: "authenticated_cli";
    connection: "explicit_cli_approval";
  };
}
export interface SourceImportInput { rootId: string; path: string; title: string; requestId: string }
export interface SourceViewApprovalInput { connectionId: string; importId: string; requestId: string }
export interface SourceFileView { importId: string; snapshotId: string; path: string; hash: string; content: string; bytes: number }
export interface SourceSnapshotExport {
  schemaVersion: "fracture.source-export/v1";
  exportedAt: string;
  view: SourceWorkspaceView;
  files: SourceFileView[];
  execution: { applicationCommands: 0; modelCalls: 0; paymentProviderCalls: 0; runtimeObserved: false };
  contentHash: string;
}
