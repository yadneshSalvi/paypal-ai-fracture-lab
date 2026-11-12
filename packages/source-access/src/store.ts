import { createHash, randomUUID } from "node:crypto";
import type { SqlConnection } from "@fracture/paypal-core";
import type { SourceBrowserConnection, SourceFileView, SourceImportInput, SourceImportSummary, SourceSnapshotExport, SourceViewApprovalInput, SourceWorkspaceIndex, SourceWorkspaceView } from "../../contracts/src/source-workspaces";
import type { SourceChangeReceipt, SourceWorkspaceSnapshot } from "../../source-workspaces/src/types";
import { LabError } from "../../service/src/errors";
import type { LabStore } from "../../service/src/store";
import { sourceApprovalSchema, sourceImportSchema, sourceMetadataSchema } from "./schemas";

export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export interface SourceOwner { sessionId: string; grantId: string }
type Row = Record<string, unknown>;
interface ImportRow extends Row {
  id: string; session_id: string; grant_id: string; request_id: string; input_hash: string;
  root_id: string; relative_path: string; title: string; created_at: string; expires_at: string;
  status: SourceImportSummary["status"]; error_code: string | null; snapshot_id: string | null; revision_hash: string | null;
  snapshot_document: string | null; snapshot_hash: string | null;
  file_count: number; total_bytes: number; finding_count: number; reserved_bytes: number;
}
interface ConnectionRow extends Row {
  id: string; session_id: string; request_id: string; created_at: string; approval_expires_at: string;
  status: "pending" | "approved" | "cancelled"; owner_session_id: string | null; owner_grant_id: string | null;
  import_id: string | null; approval_request_id: string | null; approval_input_hash: string | null; view_expires_at: string | null;
}
interface ChangeRow extends Row { id: string; import_id: string; session_id: string; request_id: string; input_hash: string; status: "pending" | "ready" | "interrupted"; created_at: string; document: string | null; document_hash: string | null; error_code: string | null }
interface FileRow extends Row { path: string; hash: string; bytes: number; content: string }

const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + canonical(object[key])).join(",") + "}";
}
const objectHash = (value: unknown) => digest(canonical(value));
const denied = () => new LabError("SOURCE_ACCESS_DENIED", "This source snapshot is not available within the current approved scope.", 404);
const corrupt = () => new LabError("SOURCE_INTEGRITY_FAILED", "The saved source receipt failed its integrity check. No source content was returned.", 409);
const iso = (value: number) => new Date(value).toISOString();

/** Source content is private data. Only the local importer ever reads the host filesystem. */
export class SourceAccessStore {
  constructor(readonly lab: LabStore, readonly now = Date.now) {}

  private async session(tx: SqlConnection, id: string, owner = false) {
    const row = (await tx.query<{ id: string; expires_at: string; role: string } & Row>("SELECT id,expires_at,role FROM lab_sessions WHERE id=$1", [id])).rows[0];
    if (!row || Date.parse(row.expires_at) <= this.now() || (owner && row.role !== "owner")) throw denied();
    return row;
  }
  private async grant(tx: SqlConnection, owner: SourceOwner) {
    const session = await this.session(tx, owner.sessionId, true);
    const row = (await tx.query<{ session_id: string; expires_at: string; revoked_at: string | null } & Row>("SELECT session_id,expires_at,revoked_at FROM lab_developer_grants WHERE id=$1 FOR UPDATE", [owner.grantId])).rows[0];
    if (!row || row.session_id !== owner.sessionId || row.revoked_at || Date.parse(row.expires_at) <= this.now()) throw denied();
    return iso(Math.min(Date.parse(session.expires_at), Date.parse(row.expires_at)));
  }
  private async owned(tx: SqlConnection, owner: SourceOwner, importId: string) {
    await this.grant(tx, owner);
    const row = (await tx.query<ImportRow>("SELECT * FROM lab_source_imports WHERE id=$1 AND session_id=$2 AND grant_id=$3", [importId, owner.sessionId, owner.grantId])).rows[0];
    if (!row || Date.parse(row.expires_at) <= this.now()) throw denied();
    return row;
  }
  private async scope(tx: SqlConnection, sessionId: string, row: ImportRow): Promise<{ access: SourceImportSummary["access"]; expiresAt: string }> {
    const viewer = await this.session(tx, sessionId);
    const grantExpires = await this.grant(tx, { sessionId: row.session_id, grantId: row.grant_id });
    if (Date.parse(row.expires_at) <= this.now()) throw denied();
    if (sessionId === row.session_id) return { access: "owner", expiresAt: iso(Math.min(Date.parse(grantExpires), Date.parse(row.expires_at))) };
    const connection = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE session_id=$1 AND import_id=$2 AND status='approved' AND owner_session_id=$3 AND owner_grant_id=$4 ORDER BY created_at DESC", [sessionId, row.id, row.session_id, row.grant_id])).rows.find(item => item.view_expires_at && Date.parse(item.view_expires_at) > this.now());
    if (!connection?.view_expires_at) throw denied();
    return { access: "approved_view", expiresAt: iso(Math.min(Date.parse(grantExpires), Date.parse(viewer.expires_at), Date.parse(row.expires_at), Date.parse(connection.view_expires_at))) };
  }
  private summary(row: ImportRow, scope: { access: SourceImportSummary["access"]; expiresAt: string }): SourceImportSummary {
    if (!sourceMetadataSchema.safeParse({ rootId: row.root_id, path: row.relative_path, title: row.title }).success) throw corrupt();
    return { id: row.id, title: row.title, rootId: row.root_id, path: row.relative_path, createdAt: row.created_at, expiresAt: scope.expiresAt, status: row.status, errorCode: row.error_code, snapshotId: row.snapshot_id, revisionHash: row.revision_hash, files: row.file_count, bytes: row.total_bytes, findings: row.finding_count, provenance: "authorized_source_snapshot", analysis: "static", runtimeObserved: false, access: scope.access };
  }
  private snapshot(row: ImportRow): SourceWorkspaceSnapshot {
    if (!row.snapshot_document || !row.snapshot_hash) throw corrupt();
    let value: SourceWorkspaceSnapshot;
    try { value = JSON.parse(row.snapshot_document) as SourceWorkspaceSnapshot; } catch { throw corrupt(); }
    const { manifestHash, ...body } = value;
    if (objectHash(value) !== row.snapshot_hash || objectHash(body) !== manifestHash || value.id !== row.snapshot_id || value.revisionHash !== row.revision_hash) throw corrupt();
    return value;
  }
  private change(row: ChangeRow): SourceChangeReceipt {
    if (!row.document || !row.document_hash) throw corrupt();
    let value: SourceChangeReceipt;
    try { value = JSON.parse(row.document) as SourceChangeReceipt; } catch { throw corrupt(); }
    const { receiptHash, ...body } = value;
    if (objectHash(value) !== row.document_hash || objectHash(body) !== receiptHash) throw corrupt();
    return value;
  }
  private async view(tx: SqlConnection, sessionId: string, importId: string): Promise<SourceWorkspaceView> {
    const row = (await tx.query<ImportRow>("SELECT * FROM lab_source_imports WHERE id=$1", [importId])).rows[0];
    if (!row) throw denied();
    const scope = await this.scope(tx, sessionId, row);
    const latest = (await tx.query<ChangeRow>("SELECT * FROM lab_source_changes WHERE import_id=$1 AND status='ready' ORDER BY created_at DESC,id DESC LIMIT 1", [row.id])).rows[0];
    const checks = (await tx.query<ChangeRow>("SELECT * FROM lab_source_changes WHERE import_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20", [row.id])).rows;
    return { import: this.summary(row, scope), snapshot: row.status === "ready" ? this.snapshot(row) : null, latestChanges: latest ? this.change(latest) : null, changeChecks: checks.map(check => ({ id: check.id, requestId: check.request_id, createdAt: check.created_at, status: check.status, errorCode: check.error_code, receipt: check.status === "ready" ? this.change(check) : null })), access: { readSource: row.status === "ready", executeSource: false, authorizePayments: false, expiresAt: scope.expiresAt } };
  }
  async get(sessionId: string, importId: string) { return this.lab.db.transaction(tx => this.view(tx, sessionId, importId)); }

  async list(sessionId: string): Promise<SourceWorkspaceIndex> {
    return this.lab.db.transaction(async tx => {
      await this.session(tx, sessionId);
      const rows = (await tx.query<ImportRow>("SELECT id,session_id,grant_id,root_id,relative_path,title,created_at,expires_at,status,error_code,snapshot_id,revision_hash,file_count,total_bytes,finding_count FROM lab_source_imports WHERE session_id=$1 OR id IN (SELECT import_id FROM lab_source_browser_connections WHERE session_id=$1 AND status='approved') ORDER BY created_at DESC LIMIT 60", [sessionId])).rows;
      const imports: SourceImportSummary[] = [];
      for (const row of rows) {
        try { imports.push(this.summary(row, await this.scope(tx, sessionId, row))); }
        catch (error) { if (!(error instanceof LabError) || error.code !== "SOURCE_ACCESS_DENIED") throw error; }
      }
      const connections = [];
      for (const row of (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE session_id=$1 ORDER BY created_at DESC LIMIT 20", [sessionId])).rows) connections.push(await this.connectionDTO(tx, row));
      return { imports, connections, capabilities: { browserImport: false, browserExecution: false, localImport: "authenticated_cli", connection: "explicit_cli_approval" } };
    });
  }
  async reserveImport(owner: SourceOwner, input: SourceImportInput) {
    const parsed = sourceImportSchema.safeParse(input);
    if (!parsed.success) throw new LabError("SOURCE_IMPORT_INPUT_INVALID", "Use a configured source root, a portable relative directory, a display name, and a request UUID.");
    input = parsed.data;
    const inputHash = objectHash(parsed.data);
    return this.lab.db.transaction(async tx => {
      const expiresAt = await this.grant(tx, owner);
      const existing = (await tx.query<ImportRow>("SELECT * FROM lab_source_imports WHERE session_id=$1 AND request_id=$2", [owner.sessionId, input.requestId])).rows[0];
      if (existing) {
        if (existing.input_hash !== inputHash || existing.grant_id !== owner.grantId) throw new LabError("SOURCE_REQUEST_CONFLICT", "This request identity is already bound to another source import.", 409);
        if (Date.parse(existing.expires_at) <= this.now()) throw denied();
        return { id: existing.id, requestKey: digest(owner.sessionId + ":" + input.requestId), status: existing.status, errorCode: existing.error_code, existing: true };
      }
      const budget = (await tx.query<{ count: number; bytes: number } & Row>("SELECT COUNT(*) AS count,COALESCE(SUM(reserved_bytes),0) AS bytes FROM lab_source_imports WHERE session_id=$1", [owner.sessionId])).rows[0];
      if (Number(budget?.count ?? 0) >= 20 || Number(budget?.bytes ?? 0) + MAX_SOURCE_BYTES > 48 * 1024 * 1024) throw new LabError("SOURCE_IMPORT_LIMIT", "This session has reached its bounded source snapshot allowance. Existing evidence remains retained.", 429);
      const id = randomUUID();
      await tx.query("INSERT INTO lab_source_imports(id,session_id,grant_id,request_id,input_hash,root_id,relative_path,title,created_at,expires_at,status,reserved_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)", [id, owner.sessionId, owner.grantId, input.requestId, inputHash, input.rootId, input.path, input.title, iso(this.now()), expiresAt, MAX_SOURCE_BYTES]);
      return { id, requestKey: digest(owner.sessionId + ":" + input.requestId), status: "pending" as const, errorCode: null, existing: false };
    });
  }
  async completeImport(owner: SourceOwner, importId: string, snapshot: SourceWorkspaceSnapshot, files: readonly { path: string; hash: string; content: string }[]) {
    const { manifestHash, ...body } = snapshot;
    if (objectHash(body) !== manifestHash || !/^sws_[a-f0-9]{64}$/.test(snapshot.id) || snapshot.schemaVersion !== "fracture.source-workspace/v1" || snapshot.graph.runtimeObserved !== false || snapshot.execution.status !== "static_only" || snapshot.tools.commandsExecuted !== 0 || snapshot.files.length > 1000 || files.length !== snapshot.files.length || snapshot.totalBytes > MAX_SOURCE_BYTES) throw corrupt();
    if (Buffer.byteLength(JSON.stringify(snapshot)) > 24 * 1024 * 1024) throw new LabError("SOURCE_METADATA_LIMIT", "This static graph exceeds the bounded snapshot metadata allowance. No source snapshot was published.", 413);
    const unique = new Map(files.map(file => [file.path, file]));
    if (unique.size !== files.length) throw corrupt();
    let total = 0;
    for (const file of snapshot.files) {
      const saved = unique.get(file.path);
      if (!saved || Buffer.byteLength(saved.content) > 512 * 1024 || saved.hash !== file.hash || digest(saved.content) !== file.hash || Buffer.byteLength(saved.content) !== file.bytes || file.bytes > 512 * 1024) throw corrupt();
      total += file.bytes;
    }
    if (total !== snapshot.totalBytes) throw corrupt();
    await this.lab.db.transaction(async tx => {
      const row = await this.owned(tx, owner, importId);
      if (row.status === "ready") { if (row.snapshot_hash !== objectHash(snapshot)) throw corrupt(); return; }
      if (row.status === "rejected") throw new LabError("SOURCE_IMPORT_REJECTED", "The original source import was rejected. Use a new request identity for a corrected import.", 409);
      for (const file of files) await tx.query("INSERT INTO lab_source_files(import_id,path,hash,bytes,content) VALUES($1,$2,$3,$4,$5)", [row.id, file.path, file.hash, Buffer.byteLength(file.content), file.content]);
      await tx.query("UPDATE lab_source_imports SET status='ready',error_code=NULL,snapshot_id=$2,snapshot_document=$3,snapshot_hash=$4,file_count=$5,total_bytes=$6,finding_count=$7,reserved_bytes=$6,revision_hash=$8 WHERE id=$1", [row.id, snapshot.id, JSON.stringify(snapshot), objectHash(snapshot), snapshot.files.length, total, snapshot.graph.findings.length, snapshot.revisionHash]);
    });
    return this.get(owner.sessionId, importId);
  }
  async retainImportFailure(owner: SourceOwner, importId: string, code: string, interrupted: boolean) {
    await this.lab.db.transaction(async tx => {
      const row = await this.owned(tx, owner, importId);
      if (row.status === "ready") return;
      await tx.query("UPDATE lab_source_imports SET status=$2,error_code=$3,reserved_bytes=$4 WHERE id=$1 AND status<>'ready'", [row.id, interrupted ? "interrupted" : "rejected", code, interrupted ? row.reserved_bytes : 0]);
    });
  }
  async readFile(sessionId: string, importId: string, path: string, expectedHash: string): Promise<SourceFileView> {
    return this.lab.db.transaction(async tx => {
      const view = await this.view(tx, sessionId, importId);
      const file = view.snapshot?.files.find(item => item.path === path);
      if (!file) throw denied();
      if (file.hash !== expectedHash) throw new LabError("SOURCE_HASH_MISMATCH", "Choose the exact file hash from the accepted snapshot.", 409);
      const row = (await tx.query<FileRow>("SELECT path,hash,bytes,content FROM lab_source_files WHERE import_id=$1 AND path=$2", [importId, path])).rows[0];
      if (!row || digest(row.content) !== file.hash || row.hash !== file.hash || Buffer.byteLength(row.content) !== file.bytes || row.bytes !== file.bytes) throw corrupt();
      return { importId, snapshotId: view.snapshot!.id, path: row.path, hash: row.hash, bytes: row.bytes, content: row.content };
    });
  }
  async report(sessionId: string, importId: string): Promise<SourceSnapshotExport> {
    return this.lab.db.transaction(async tx => {
      const view = await this.view(tx, sessionId, importId);
      if (!view.snapshot) throw new LabError("SOURCE_IMPORT_INCOMPLETE", "The original source import has no accepted snapshot to export.", 409);
      const rows = (await tx.query<FileRow>("SELECT path,hash,bytes,content FROM lab_source_files WHERE import_id=$1 ORDER BY path", [importId])).rows;
      const manifest = new Map(view.snapshot.files.map(file => [file.path, file]));
      if (rows.length !== manifest.size || rows.some(file => file.hash !== manifest.get(file.path)?.hash || digest(file.content) !== file.hash || Buffer.byteLength(file.content) !== manifest.get(file.path)?.bytes)) throw corrupt();
      const value = { schemaVersion: "fracture.source-export/v1" as const, exportedAt: iso(this.now()), view, files: rows.map(file => ({ ...file, importId, snapshotId: view.snapshot!.id })), execution: { applicationCommands: 0 as const, modelCalls: 0 as const, paymentProviderCalls: 0 as const, runtimeObserved: false as const } };
      return { ...value, contentHash: objectHash(value) };
    });
  }

  private async connectionDTO(tx: SqlConnection, row: ConnectionRow): Promise<SourceBrowserConnection> {
    let status: SourceBrowserConnection["status"] = row.status;
    if (status === "pending" && Date.parse(row.approval_expires_at) <= this.now()) status = "expired";
    if (status === "approved") {
      if (!row.view_expires_at || Date.parse(row.view_expires_at) <= this.now()) status = "expired";
      else {
        try { await this.grant(tx, { sessionId: row.owner_session_id!, grantId: row.owner_grant_id! }); }
        catch (error) { if (!(error instanceof LabError) || error.code !== "SOURCE_ACCESS_DENIED") throw error; status = "expired"; }
      }
    }
    return { id: row.id, requestId: row.request_id, confirmationLabel: row.id.slice(0, 8).toUpperCase(), createdAt: row.created_at, approvalExpiresAt: row.approval_expires_at, viewExpiresAt: row.view_expires_at, status, importId: status === "approved" ? row.import_id : null, scope: "one_source_snapshot_read_only" };
  }
  async connect(sessionId: string, requestId: string): Promise<SourceBrowserConnection> {
    return this.lab.db.transaction(async tx => {
      const session = await this.session(tx, sessionId);
      await tx.query("SELECT id FROM lab_sessions WHERE id=$1 FOR UPDATE", [sessionId]);
      const old = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE session_id=$1 AND request_id=$2", [sessionId, requestId])).rows[0];
      if (old) return this.connectionDTO(tx, old);
      const active = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE session_id=$1 AND status='pending' AND approval_expires_at>$2", [sessionId, iso(this.now())])).rows[0];
      if (active) throw new LabError("SOURCE_CONNECTION_ACTIVE", "An unexpired browser request already exists. Approve or cancel that request first.", 409);
      const id = randomUUID();
      await tx.query("INSERT INTO lab_source_browser_connections(id,session_id,request_id,created_at,approval_expires_at,status) VALUES($1,$2,$3,$4,$5,'pending')", [id, sessionId, requestId, iso(this.now()), iso(Math.min(this.now() + 5 * 60_000, Date.parse(session.expires_at)))]);
      return this.connectionDTO(tx, (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE id=$1", [id])).rows[0]!);
    });
  }
  async connection(sessionId: string, id: string) {
    return this.lab.db.transaction(async tx => {
      await this.session(tx, sessionId);
      const row = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE id=$1 AND session_id=$2", [id, sessionId])).rows[0];
      if (!row) throw denied();
      return this.connectionDTO(tx, row);
    });
  }
  async cancelConnection(sessionId: string, id: string) {
    return this.lab.db.transaction(async tx => {
      await this.session(tx, sessionId);
      const row = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE id=$1 AND session_id=$2 FOR UPDATE", [id, sessionId])).rows[0];
      if (!row) throw denied();
      await tx.query("UPDATE lab_source_browser_connections SET status='cancelled' WHERE id=$1", [id]);
      return this.connectionDTO(tx, { ...row, status: "cancelled" });
    });
  }
  async approve(owner: SourceOwner, input: SourceViewApprovalInput) {
    const parsed = sourceApprovalSchema.safeParse(input);
    if (!parsed.success) throw new LabError("SOURCE_APPROVAL_INVALID", "Approval requires the exact browser request, owned import, and command UUID.");
    return this.lab.db.transaction(async tx => {
      const imported = await this.owned(tx, owner, input.importId);
      if (imported.status !== "ready") throw new LabError("SOURCE_IMPORT_INCOMPLETE", "Only a complete accepted snapshot can be shared with this browser.", 409);
      const row = (await tx.query<ConnectionRow>("SELECT * FROM lab_source_browser_connections WHERE id=$1 FOR UPDATE", [input.connectionId])).rows[0];
      if (!row) throw denied();
      const viewer = await this.session(tx, row.session_id);
      const inputHash = objectHash(input);
      if (row.status === "approved") {
        if (row.owner_session_id !== owner.sessionId || row.owner_grant_id !== owner.grantId || row.approval_input_hash !== inputHash) throw new LabError("SOURCE_APPROVAL_CONFLICT", "This browser request already has a different recorded approval.", 409);
        return this.connectionDTO(tx, row);
      }
      if (row.status !== "pending" || Date.parse(row.approval_expires_at) <= this.now()) throw new LabError("SOURCE_CONNECTION_EXPIRED", "This browser request expired or was cancelled. A new browser request needs explicit approval.", 409);
      const expiresAt = iso(Math.min(Date.parse(imported.expires_at), Date.parse(viewer.expires_at)));
      await tx.query("UPDATE lab_source_browser_connections SET status='approved',owner_session_id=$2,owner_grant_id=$3,import_id=$4,approval_request_id=$5,approval_input_hash=$6,view_expires_at=$7 WHERE id=$1", [row.id, owner.sessionId, owner.grantId, imported.id, input.requestId, inputHash, expiresAt]);
      return this.connectionDTO(tx, { ...row, status: "approved", owner_session_id: owner.sessionId, owner_grant_id: owner.grantId, import_id: imported.id, approval_request_id: input.requestId, approval_input_hash: inputHash, view_expires_at: expiresAt });
    });
  }
  async beginChanges(owner: SourceOwner, importId: string, requestId: string) {
    return this.lab.db.transaction(async tx => {
      const imported = await this.owned(tx, owner, importId);
      if (imported.status !== "ready") throw new LabError("SOURCE_IMPORT_INCOMPLETE", "A change check requires an accepted source snapshot.", 409);
      const inputHash = objectHash({ importId, requestId });
      const old = (await tx.query<ChangeRow>("SELECT * FROM lab_source_changes WHERE session_id=$1 AND request_id=$2", [owner.sessionId, requestId])).rows[0];
      if (old) {
        if (old.input_hash !== inputHash) throw new LabError("SOURCE_REQUEST_CONFLICT", "This change-check identity is already bound to another snapshot.", 409);
        if (old.status !== "ready") throw new LabError("SOURCE_CHANGE_PENDING", "The original change check is pending or interrupted. Use a new request UUID for a separately identified observation.", 409);
        return { id: old.id, snapshotId: imported.snapshot_id!, receipt: this.change(old), created: false };
      }
      const count = (await tx.query<{ count: number } & Row>("SELECT COUNT(*) AS count FROM lab_source_changes WHERE import_id=$1", [importId])).rows[0];
      if (Number(count?.count ?? 0) >= 20) throw new LabError("SOURCE_CHANGE_LIMIT", "This snapshot has twenty retained change observations. Import a new explicitly identified snapshot to continue; all original checks stay retained.", 429);
      const id = randomUUID();
      await tx.query("INSERT INTO lab_source_changes(id,import_id,session_id,request_id,input_hash,status,created_at) VALUES($1,$2,$3,$4,$5,'pending',$6)", [id, importId, owner.sessionId, requestId, inputHash, iso(this.now())]);
      return { id, snapshotId: imported.snapshot_id!, receipt: null, created: true };
    });
  }
  async completeChanges(owner: SourceOwner, commandId: string, receipt: SourceChangeReceipt) {
    return this.lab.db.transaction(async tx => {
      await this.grant(tx, owner);
      const row = (await tx.query<ChangeRow>("SELECT * FROM lab_source_changes WHERE id=$1 AND session_id=$2", [commandId, owner.sessionId])).rows[0];
      if (!row) throw denied();
      const imported = await this.owned(tx, owner, row.import_id);
      const snapshot = this.snapshot(imported);
      const { receiptHash, ...body } = receipt;
      if (objectHash(body) !== receiptHash || receipt.snapshotId !== snapshot.id || receipt.baselineRevisionHash !== snapshot.revisionHash) throw corrupt();
      if (row.status === "ready") { if (row.document_hash !== objectHash(receipt)) throw corrupt(); return this.change(row); }
      await tx.query("UPDATE lab_source_changes SET status='ready',document=$2,document_hash=$3,error_code=NULL WHERE id=$1", [row.id, JSON.stringify(receipt), objectHash(receipt)]);
      return receipt;
    });
  }
  async retainChangeFailure(owner: SourceOwner, commandId: string, errorCode: string) {
    await this.lab.db.transaction(async tx => {
      await this.grant(tx, owner);
      await tx.query("UPDATE lab_source_changes SET status='interrupted',error_code=$3 WHERE id=$1 AND session_id=$2 AND status<>'ready'", [commandId, owner.sessionId, errorCode]);
    });
  }
}
