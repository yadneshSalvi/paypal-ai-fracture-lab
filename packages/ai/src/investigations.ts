import { randomUUID } from "node:crypto";
import { canonicalJson, sha256, type SqlConnection } from "@fracture/paypal-core";
import type { EvidenceDTO, RunDTO } from "@fracture/contracts";
import { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import { GeminiInteractionModel } from "./gemini";
import { modelAttemptIdentity } from "./model";
import { selectToolkitOrder, readSelectedToolkitOrder, concludeToolkitReview } from "./toolkit-review";

export const toolkitInvestigationSchema = [
  `CREATE TABLE IF NOT EXISTS lab_toolkit_reviews(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,run_id TEXT NOT NULL,request_id TEXT NOT NULL,input_hash TEXT NOT NULL,witness_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,status TEXT NOT NULL,phase TEXT NOT NULL,lease_owner TEXT,lease_until TEXT,workflow_id TEXT,dispatch_version INTEGER NOT NULL DEFAULT 0,result_evidence_id TEXT,error_code TEXT,document TEXT NOT NULL,UNIQUE(session_id,request_id))`,
  `CREATE INDEX IF NOT EXISTS lab_toolkit_reviews_session ON lab_toolkit_reviews(session_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS lab_toolkit_commands(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,review_id TEXT NOT NULL,input_hash TEXT NOT NULL,created_at TEXT NOT NULL,document TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS lab_toolkit_commands_review ON lab_toolkit_commands(session_id,review_id,created_at)`,
];
export type InvestigationStatus = "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
export type InvestigationPhase = "selection" | "read" | "conclusion" | "completed";
interface Snapshot { schemaVersion: 1; sessionId: string; actionId: string; model: string; witness: RunDTO; witnessHash: string }
interface CommandReceipt { schemaVersion: 1; id: string; reviewId: string; requestId: string; action: "resume" | "cancel"; createdAt: string; previousStatus: InvestigationStatus; status: InvestigationStatus; phase: InvestigationPhase; dispatchVersion: number; sha256: string }
interface Row extends Record<string, unknown> {
  id: string; session_id: string; run_id: string; request_id: string; input_hash: string; witness_hash: string;
  created_at: string; updated_at: string; status: InvestigationStatus; phase: InvestigationPhase;
  lease_owner: string | null; lease_until: string | null; workflow_id: string | null; dispatch_version: number;
  result_evidence_id: string | null; error_code: string | null; document: string;
}
export interface ToolkitInvestigation {
  id: string; runId: string; actionId: string; createdAt: string; updatedAt: string; status: InvestigationStatus; phase: InvestigationPhase;
  witness: { title: string; source: "sample"; sourceHash: string; scenario: string; orderId: string; capturedMinor: number; currency: string; captureCount: number };
  model: string; errorCode: string | null; leaseUntil: string | null; workflowId: string | null; dispatchVersion: number;
  result: { evidenceId: string; conclusion: string; observedOrderStatus: string; uncertainty: string[]; toolReceiptId: string; modelEvidenceIds: string[] } | null;
  receiptIds: { selection: string; read: string; conclusion: string; result: string };
  availableReceiptIds: string[];
}
const terminal = (status: string) => ["completed", "failed", "cancelled"].includes(status);
const requestHash = (runId: string, requestId: string) => sha256(canonicalJson({ kind: "toolkit_review", runId, requestId, schemaVersion: 1 }));
const phases: InvestigationPhase[] = ["selection", "read", "conclusion", "completed"];
const errorCode = (error: unknown) => error instanceof LabError ? error.code : "INVESTIGATION_WORKER_FAILURE";
function snapshot(row: Row): Snapshot {
  let saved: Snapshot;
  try { saved = JSON.parse(row.document) as Snapshot; } catch { throw new LabError("INVESTIGATION_RECORD_INVALID", "The saved investigation could not be read.", 409); }
  if (!saved || saved.schemaVersion !== 1 || saved.sessionId !== row.session_id || saved.actionId !== row.request_id || !saved.witness || saved.witness.id !== row.run_id || saved.witness.source !== "sample" || saved.witnessHash !== row.witness_hash || sha256(canonicalJson(saved.witness)) !== row.witness_hash || row.input_hash !== requestHash(row.run_id, row.request_id) || !phases.includes(row.phase)) throw new LabError("INVESTIGATION_RECORD_INVALID", "The saved investigation no longer matches its original witness.", 409);
  return saved;
}
const receiptIds = (row: Row) => ({ selection: modelAttemptIdentity(row.session_id, row.request_id, "toolkit_order_selection"), read: modelAttemptIdentity(row.session_id, row.request_id, "toolkit_order_read"), conclusion: modelAttemptIdentity(row.session_id, row.request_id, "toolkit_order_conclusion"), result: modelAttemptIdentity(row.session_id, row.request_id, "toolkit_review_conclusion") });

/** One immutable Sample witness, three durable phases, and no automatic model replacement. */
export class ToolkitInvestigations {
  constructor(readonly store: LabStore) {}
  async initialize() {
    // IF NOT EXISTS alone does not serialize PostgreSQL's underlying type creation.
    // The existing, schema-local row lock also coordinates separate cold workers.
    await this.store.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");
      for (const sql of toolkitInvestigationSchema) await tx.query(sql);
    });
  }
  async available() {
    if (this.store.db.dialect === "postgres") return Boolean((await this.store.db.query<{ present: string | null } & Record<string, unknown>>("SELECT to_regclass('lab_toolkit_reviews') AS present")).rows[0]?.present);
    return (await this.store.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='lab_toolkit_reviews'")).rowCount === 1;
  }
  private async sessionAuthority(connection: SqlConnection, sessionId: string) {
    const session = (await connection.query<{ expires_at: string; role: string } & Record<string, unknown>>("SELECT expires_at,role FROM lab_sessions WHERE id=$1", [sessionId])).rows[0];
    if (!session || Date.parse(session.expires_at) <= Date.now()) throw new LabError("SESSION_EXPIRED", "The original session expired. Its evidence is retained.", 401);
    if (session.role === "owner" && !(await connection.query("SELECT id FROM lab_developer_grants WHERE session_id=$1 AND revoked_at IS NULL AND expires_at>$2", [sessionId, new Date().toISOString()])).rowCount) throw new LabError("DEVELOPER_ACCESS_DENIED", "The developer grant is no longer active. Its retained evidence is not available through this grant.", 401);
  }
  async authority(connection: SqlConnection, sessionId: string, runId: string) {
    await this.sessionAuthority(connection, sessionId);
    const row = await this.store.record(runId, sessionId, connection);
    const run = JSON.parse(row.document) as RunDTO;
    if (row.cancelled || run.source !== "sample") throw new LabError("WORK_CANCELLED", "The original Sample witness no longer authorizes this investigation.", 409);
    return run;
  }
  async begin(sessionId: string, runId: string, requestId: string) {
    if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(requestId)) throw new LabError("INVALID_REQUEST", "Use one durable request identity.", 400);
    const witness = await this.authority(this.store.db, sessionId, runId);
    if (witness.stage !== "completed" || !witness.orderIds[0]) throw new LabError("TOOLKIT_WITNESS_REQUIRED", "Choose a completed Sample purchase with an original order.", 409);
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) throw new LabError("MODEL_CONFIGURATION_REQUIRED", "Gemini is not configured on this server. Existing receipts remain readable.", 503);
    if (!(await this.store.db.query("SELECT id FROM lab_provider_resources WHERE run_id=$1 AND id=$2 AND kind='order'", [runId, witness.orderIds[0]])).rowCount) throw new LabError("TOOLKIT_RESOURCE_MISSING", "The original order is unavailable.", 409);
    await this.initialize();
    const id = modelAttemptIdentity(sessionId, requestId, "toolkit_investigation");
    const existing = (await this.store.db.query<Row>("SELECT * FROM lab_toolkit_reviews WHERE id=$1 AND session_id=$2", [id, sessionId])).rows[0];
    if (existing) {
      if (existing.input_hash !== requestHash(runId, requestId)) throw new LabError("ACTION_CONFLICT", "This identity belongs to another investigation.", 409);
      return this.project(existing);
    }
    await this.store.rateLimit(`toolkit-investigation:${sessionId}`, 12); await this.store.rateLimit("toolkit-investigation:global", 30);
    await this.store.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [runId, sessionId]);
      const original = await this.authority(tx, sessionId, runId);
      const prior = (await tx.query<{ input_hash: string } & Record<string, unknown>>("SELECT input_hash FROM lab_actions WHERE id=$1 AND session_id=$2", [requestId, sessionId])).rows[0];
      const inputHash = requestHash(runId, requestId);
      if (prior) {
        if (prior.input_hash !== inputHash || !(await tx.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 AND session_id=$2", [id, sessionId])).rowCount) throw new LabError("ACTION_CONFLICT", "This request identity is already attached to another action.", 409);
        return;
      }
      if ((await tx.query("SELECT id FROM lab_actions WHERE run_id=$1 AND stage='running'", [runId])).rowCount) throw new LabError("ACTION_IN_PROGRESS", "Finish or stop the current work on this witness first.", 409);
      const now = new Date().toISOString();
      const witnessHash = sha256(canonicalJson(original));
      const saved: Snapshot = { schemaVersion: 1, sessionId, actionId: requestId, model: process.env.GEMINI_MODEL!, witness: original, witnessHash };
      // Diagnosis is the existing cancellable action family; the new job retains its Toolkit-specific phases.
      await tx.query("INSERT INTO lab_actions(id,session_id,run_id,action,input_hash,stage,created_at) VALUES($1,$2,$3,'diagnose',$4,'running',$5)", [requestId, sessionId, runId, inputHash, now]);
      await tx.query("INSERT INTO lab_toolkit_reviews(id,session_id,run_id,request_id,input_hash,witness_hash,created_at,updated_at,status,phase,document) VALUES($1,$2,$3,$4,$5,$6,$7,$7,'queued','selection',$8)", [id, sessionId, runId, requestId, inputHash, witnessHash, now, JSON.stringify(saved)]);
    });
    return this.get(sessionId, id);
  }
  private async row(id: string, sessionId?: string, connection: SqlConnection = this.store.db) {
    const row = (await connection.query<Row>(`SELECT * FROM lab_toolkit_reviews WHERE id=$1${sessionId ? " AND session_id=$2" : ""}`, sessionId ? [id, sessionId] : [id])).rows[0];
    if (!row) throw new LabError("INVESTIGATION_NOT_FOUND", "This investigation is not in the current workspace.", 404);
    snapshot(row);
    return row;
  }
  private async project(row: Row): Promise<ToolkitInvestigation> {
    const saved = snapshot(row), witness = saved.witness;
    const ids = receiptIds(row);
    const receipts = (await this.store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_evidence WHERE session_id=$1 AND run_id=$2 AND id IN ($3,$4,$5,$6)", [row.session_id, row.run_id, ...Object.values(ids)])).rows.map(item => JSON.parse(item.document) as EvidenceDTO);
    if (receipts.some(item => !Object.values(ids).includes(item.id) || item.runId !== row.run_id || item.sha256 !== sha256(canonicalJson(item.body)))) throw new LabError("INVESTIGATION_EVIDENCE_CHANGED", "A retained receipt no longer matches its original hash.", 409);
    let result: ToolkitInvestigation["result"] = null;
    if (row.result_evidence_id) {
      const evidence = receipts.find(item => item.id === row.result_evidence_id);
      if (evidence && evidence.sha256 === sha256(canonicalJson(evidence.body)) && evidence.id === ids.result && evidence.runId === row.run_id && evidence.source === "sample" && evidence.body.toolReceiptId === ids.read && canonicalJson(evidence.body.modelEvidenceIds) === canonicalJson([ids.selection, ids.conclusion])) {
        const body = evidence.body;
        result = { evidenceId: evidence.id, conclusion: String(body.conclusion), observedOrderStatus: String(body.observedOrderStatus), uncertainty: Array.isArray(body.uncertainty) ? body.uncertainty.filter((value): value is string => typeof value === "string") : [], toolReceiptId: String(body.toolReceiptId), modelEvidenceIds: Array.isArray(body.modelEvidenceIds) ? body.modelEvidenceIds.filter((value): value is string => typeof value === "string") : [] };
      }
    }
    if (row.status === "completed" && (!result || receipts.length !== Object.keys(ids).length)) throw new LabError("INVESTIGATION_EVIDENCE_CHANGED", "The completed investigation has no matching complete original receipt chain.", 409);
    return { id: row.id, runId: row.run_id, actionId: row.request_id, createdAt: row.created_at, updatedAt: row.updated_at, status: row.status, phase: row.phase, model: saved.model, errorCode: row.error_code, leaseUntil: row.lease_until, workflowId: row.workflow_id, dispatchVersion: Number(row.dispatch_version), witness: { title: witness.projectName, source: "sample", sourceHash: witness.sourceHash, scenario: witness.scenarioTitle, orderId: witness.orderIds[0]!, capturedMinor: witness.capturedMinor, currency: witness.currency, captureCount: witness.captureCount }, result, receiptIds: ids, availableReceiptIds: receipts.map(item => item.id) };
  }
  async get(sessionId: string, id: string) {
    await this.sessionAuthority(this.store.db, sessionId);
    if (!await this.available()) throw new LabError("INVESTIGATION_NOT_FOUND", "No investigation was created in this workspace.", 404);
    return this.project(await this.row(id, sessionId));
  }
  async list(sessionId: string) {
    await this.sessionAuthority(this.store.db, sessionId);
    if (!await this.available()) return [];
    const rows = (await this.store.db.query<Row>("SELECT * FROM lab_toolkit_reviews WHERE session_id=$1 ORDER BY created_at DESC,id LIMIT 50", [sessionId])).rows;
    return Promise.all(rows.map(row => this.project(row)));
  }
  async findByRequest(sessionId: string, requestId: string) {
    await this.sessionAuthority(this.store.db, sessionId);
    if (!await this.available()) return null;
    const row = (await this.store.db.query<Row>("SELECT * FROM lab_toolkit_reviews WHERE session_id=$1 AND request_id=$2", [sessionId, requestId])).rows[0];
    return row ? this.project(row) : null;
  }
  async pending() {
    if (!await this.available()) return [];
    return (await this.store.db.query<{ id: string } & Record<string, unknown>>("SELECT id FROM lab_toolkit_reviews WHERE status IN ('queued','running') ORDER BY created_at LIMIT 20")).rows.map(row => row.id);
  }
  async dispatchIdentity(id: string) { const row = await this.row(id); return { version: Number(row.dispatch_version), status: row.status, workflowId: row.workflow_id }; }
  async recordWorkflow(id: string, version: number, workflowId: string) {
    await this.store.db.query("UPDATE lab_toolkit_reviews SET workflow_id=$3 WHERE id=$1 AND dispatch_version=$2 AND status IN ('queued','running')", [id, version, workflowId]);
  }
  async workflowStopped(id: string, version: number, workflowId: string) {
    await this.store.db.query("UPDATE lab_toolkit_reviews SET status='waiting',error_code='WORKFLOW_STOPPED',updated_at=$4 WHERE id=$1 AND dispatch_version=$2 AND workflow_id=$3 AND (status='queued' OR (status='running' AND lease_until<=$4))", [id, version, workflowId, new Date().toISOString()]);
  }
  private async priorCommand(connection: SqlConnection, row: Row, kind: CommandReceipt["action"], requestId: string) {
    if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(requestId)) throw new LabError("INVALID_REQUEST", "Use one durable command identity.", 400);
    const id = modelAttemptIdentity(row.session_id, requestId, "toolkit_command");
    const inputHash = sha256(canonicalJson({ reviewId: row.id, kind, requestId }));
    const prior = (await connection.query<{ input_hash: string } & Record<string, unknown>>("SELECT input_hash FROM lab_toolkit_commands WHERE id=$1 AND session_id=$2", [id, row.session_id])).rows[0];
    if (prior && prior.input_hash !== inputHash) throw new LabError("ACTION_CONFLICT", "This command identity belongs to another operation.", 409);
    return { id, inputHash, exists: Boolean(prior) };
  }
  private async saveCommand(connection: SqlConnection, previous: Row, kind: CommandReceipt["action"], requestId: string, claim: { id: string; inputHash: string }) {
    const current = await this.row(previous.id, previous.session_id, connection);
    const body: Omit<CommandReceipt, "sha256"> = { schemaVersion: 1, id: claim.id, reviewId: previous.id, requestId, action: kind, createdAt: new Date().toISOString(), previousStatus: previous.status, status: current.status, phase: current.phase, dispatchVersion: Number(current.dispatch_version) };
    const receipt = { ...body, sha256: sha256(canonicalJson(body)) };
    await connection.query("INSERT INTO lab_toolkit_commands(id,session_id,review_id,input_hash,created_at,document) VALUES($1,$2,$3,$4,$5,$6)", [claim.id, previous.session_id, previous.id, claim.inputHash, body.createdAt, JSON.stringify(receipt)]);
  }
  async resume(sessionId: string, id: string, requestId: string = randomUUID()) {
    const original = await this.row(id, sessionId);
    await this.initialize();
    await this.store.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.run_id, sessionId]);
      await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.request_id, sessionId]);
      await tx.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 FOR UPDATE", [id]);
      await this.authority(tx, sessionId, original.run_id);
      const row = await this.row(id, sessionId, tx);
      const claim = await this.priorCommand(tx, row, "resume", requestId);
      if (claim.exists) return;
      if (terminal(row.status)) { await this.saveCommand(tx, row, "resume", requestId, claim); return; }
      if (row.status === "running" && row.lease_until && row.lease_until > new Date().toISOString()) throw new LabError("INVESTIGATION_WORKER_ACTIVE", "The original worker lease is still active. Read its saved progress before resuming.", 409);
      if (row.status === "queued") { await this.saveCommand(tx, row, "resume", requestId, claim); return; }
      await tx.query("UPDATE lab_toolkit_reviews SET status='queued',workflow_id=NULL,dispatch_version=dispatch_version+1,lease_owner=NULL,lease_until=NULL,error_code=NULL,updated_at=$2 WHERE id=$1", [id, new Date().toISOString()]);
      await this.saveCommand(tx, row, "resume", requestId, claim);
    });
    return this.get(sessionId, id);
  }
  async cancel(sessionId: string, id: string, requestId: string = randomUUID()) {
    const original = await this.row(id, sessionId);
    await this.sessionAuthority(this.store.db, sessionId);
    await this.initialize();
    await this.store.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.run_id, sessionId]);
      await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.request_id, sessionId]);
      await tx.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 FOR UPDATE", [id]);
      await this.sessionAuthority(tx, sessionId);
      const row = await this.row(id, sessionId, tx);
      const claim = await this.priorCommand(tx, row, "cancel", requestId);
      if (claim.exists) return;
      if (terminal(row.status)) { await this.saveCommand(tx, row, "cancel", requestId, claim); return; }
      await tx.query("UPDATE lab_actions SET stage='cancelled' WHERE id=$1 AND session_id=$2 AND stage='running'", [original.request_id, sessionId]);
      await tx.query("UPDATE lab_toolkit_reviews SET status='cancelled',lease_until=NULL,error_code='WORK_CANCELLED',updated_at=$2 WHERE id=$1", [id, new Date().toISOString()]);
      await this.saveCommand(tx, row, "cancel", requestId, claim);
    });
    return this.get(sessionId, id);
  }
  private async current(row: Row, owner: string, connection: SqlConnection = this.store.db) {
    const current = await this.row(row.id, row.session_id, connection);
    const action = (await connection.query<{ stage: string } & Record<string, unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2", [row.request_id, row.session_id])).rows[0];
    const run = await this.authority(connection, row.session_id, row.run_id);
    if (current.status !== "running" || current.lease_owner !== owner || !current.lease_until || current.lease_until <= new Date().toISOString() || action?.stage !== "running" || run.sourceHash !== snapshot(row).witness.sourceHash) throw new LabError("WORK_CANCELLED", "The original investigation no longer has worker authority.", 409);
  }
  async advance(id: string, options: { modelFactory?: (actionId: string, signal: AbortSignal) => GeminiInteractionModel } = {}) {
    const original = await this.row(id);
    if (terminal(original.status) || original.status === "waiting") return { done: true, status: original.status };
    const owner = randomUUID();
    const now = new Date().toISOString();
    const claimed = await this.store.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");
      await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.run_id, original.session_id]);
      await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [original.request_id, original.session_id]);
      await tx.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 FOR UPDATE", [id]);
      const row = await this.row(id, undefined, tx);
      if (terminal(row.status) || row.status === "waiting" || row.status === "running" && row.lease_until && row.lease_until > now) return null;
      const active = (await tx.query("SELECT id FROM lab_toolkit_reviews WHERE status='running' AND lease_until>$1", [now])).rowCount + (await tx.query("SELECT id FROM lab_jobs WHERE stage='running' AND lease_until>$1", [now])).rowCount;
      if (active >= 3) return null;
      const ids = receiptIds(row);
      const unresolved = (await tx.query<{ id: string; document: string } & Record<string, unknown>>("SELECT id,document FROM lab_model_attempts WHERE id IN ($1,$2) AND status='running'", [ids.selection, ids.conclusion])).rows;
      if (unresolved.length) {
        for (const attempt of unresolved) {
          const retained = JSON.parse(attempt.document) as Record<string, unknown>;
          await tx.query("UPDATE lab_model_attempts SET status='failed',document=$2 WHERE id=$1 AND status='running'", [attempt.id, JSON.stringify({ ...retained, status: "failed", errorCode: "MODEL_DISPATCH_UNKNOWN", interruptedAt: now })]);
        }
        await tx.query("UPDATE lab_toolkit_reviews SET status='failed',error_code='MODEL_DISPATCH_UNKNOWN',lease_until=NULL,updated_at=$2 WHERE id=$1", [id, now]);
        await tx.query("UPDATE lab_actions SET stage='failed' WHERE id=$1 AND session_id=$2 AND stage='running'", [row.request_id, row.session_id]);
        return null;
      }
      await tx.query("UPDATE lab_toolkit_reviews SET status='running',lease_owner=$2,lease_until=$3,updated_at=$4 WHERE id=$1", [id, owner, new Date(Date.now() + 240_000).toISOString(), now]);
      return row;
    });
    if (!claimed) { const latest = await this.row(id); return { done: terminal(latest.status) || latest.status === "waiting", status: latest.status }; }
    const saved = snapshot(claimed);
    const abort = new AbortController();
    let pulsing = false;
    const heartbeat = setInterval(() => {
      if (pulsing) return; pulsing = true;
      void (async () => { await this.current(claimed, owner); await this.store.db.query("UPDATE lab_toolkit_reviews SET lease_until=$3 WHERE id=$1 AND lease_owner=$2 AND status='running'", [id, owner, new Date(Date.now() + 240_000).toISOString()]); })().catch(() => abort.abort()).finally(() => { pulsing = false; });
    }, 5000);
    try {
      await this.current(claimed, owner);
      if (process.env.GEMINI_MODEL !== saved.model || !process.env.GEMINI_API_KEY) throw new LabError("MODEL_CONFIGURATION_CHANGED", "The configured model differs from the saved investigation. No substitute was dispatched.", 409);
      const client = options.modelFactory?.(claimed.request_id, abort.signal) ?? new GeminiInteractionModel(this.store, claimed.request_id, undefined, abort.signal);
      let next: InvestigationPhase;
      let evidence: EvidenceDTO | null = null;
      if (claimed.phase === "selection") { await selectToolkitOrder(this.store, claimed.session_id, saved.witness, client); next = "read"; }
      else if (claimed.phase === "read") { await readSelectedToolkitOrder(this.store, claimed.session_id, saved.witness, claimed.request_id); next = "conclusion"; }
      else if (claimed.phase === "conclusion") { evidence = await concludeToolkitReview(this.store, claimed.session_id, saved.witness, client); next = "completed"; }
      else throw new LabError("INVESTIGATION_PHASE_INVALID", "The saved phase is not executable.", 409);
      await this.store.db.transaction(async tx => {
        await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [claimed.run_id, claimed.session_id]);
        await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [claimed.request_id, claimed.session_id]);
        await tx.query("SELECT id FROM lab_toolkit_reviews WHERE id=$1 FOR UPDATE", [id]);
        await this.current(claimed, owner, tx);
        await tx.query("UPDATE lab_toolkit_reviews SET status=$2,phase=$3,result_evidence_id=$4,lease_owner=NULL,lease_until=NULL,updated_at=$5 WHERE id=$1", [id, next === "completed" ? "completed" : "queued", next, evidence?.id ?? null, new Date().toISOString()]);
        if (next === "completed") await tx.query("UPDATE lab_actions SET stage='completed' WHERE id=$1 AND session_id=$2 AND stage='running'", [claimed.request_id, claimed.session_id]);
      });
    } catch (error) {
      const code = abort.signal.aborted ? "WORK_CANCELLED" : errorCode(error);
      const status = ["WORK_CANCELLED", "SESSION_EXPIRED", "DEVELOPER_ACCESS_DENIED"].includes(code) ? "cancelled" : "failed";
      await this.store.db.transaction(async tx => {
        await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [claimed.request_id, claimed.session_id]);
        const changed = await tx.query("UPDATE lab_toolkit_reviews SET status=$3,error_code=$4,lease_until=NULL,updated_at=$5 WHERE id=$1 AND lease_owner=$2 AND status='running'", [id, owner, status, code, new Date().toISOString()]);
        if (changed.rowCount) await tx.query("UPDATE lab_actions SET stage=$3 WHERE id=$1 AND session_id=$2 AND stage='running'", [claimed.request_id, claimed.session_id, status]);
      });
    } finally { clearInterval(heartbeat); }
    const latest = await this.row(id);
    return { done: terminal(latest.status), status: latest.status };
  }
  async report(sessionId: string, id: string) {
    const review = await this.get(sessionId, id);
    const row = await this.row(id, sessionId), saved = snapshot(row);
    const ids = Object.values(receiptIds(row));
    const records = (await this.store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_evidence WHERE session_id=$1 AND run_id=$2 AND id IN ($3,$4,$5,$6) ORDER BY created_at,id", [sessionId, row.run_id, ...ids])).rows.map(row => JSON.parse(row.document) as EvidenceDTO);
    if (records.some(evidence => !ids.includes(evidence.id) || evidence.runId !== row.run_id || evidence.source !== "sample" || evidence.sha256 !== sha256(canonicalJson(evidence.body))) || review.status === "completed" && records.length !== ids.length) throw new LabError("INVESTIGATION_EVIDENCE_CHANGED", "A retained receipt no longer matches its original chain and hash.", 409);
    const commands = (await this.store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_toolkit_commands WHERE session_id=$1 AND review_id=$2 ORDER BY created_at,id", [sessionId, id])).rows.map(item => JSON.parse(item.document) as CommandReceipt);
    if (commands.some(({ sha256: digest, ...command }) => command.reviewId !== id || digest !== sha256(canonicalJson(command)))) throw new LabError("INVESTIGATION_EVIDENCE_CHANGED", "A saved command receipt no longer matches its hash.", 409);
    const report = { schemaVersion: 1, kind: "toolkit-investigation", review, witness: { id: saved.witness.id, source: saved.witness.source, sourceHash: saved.witness.sourceHash, seed: saved.witness.seed, scenarioId: saved.witness.scenarioId, invariants: saved.witness.invariants, events: saved.witness.events, witnessHash: saved.witnessHash }, evidence: records, commands, scope: { toolkit: "@paypal/agent-toolkit 1.11.0", operation: "get_order", paymentProviderNetworkRequests: 0, comparisonStudy: false, privateContextIncluded: false }, limitations: ["The Toolkit observes a controlled Sample order, not a live payment.", "A model conclusion is not independent repair verification.", "Every failed or cancelled attempt remains attached to its original identity."] };
    return { ...report, sha256: sha256(canonicalJson(report)) };
  }
}
