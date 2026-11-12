import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { SqlConnection } from "@fracture/paypal-core";
import type { CampaignCaseDTO, CampaignCaseResult, CampaignCaseSpec, CampaignEventDTO, CampaignLabDTO, CampaignManifest, CampaignStatus } from "../../contracts/src/campaign-lab";
import type { RunDTO } from "../../contracts/src/index";
import { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import { caseResult, clusterSymptoms, reductionCertificate } from "./analysis";
import { assertCampaignGrant, developerCampaignAuthority, type CampaignDocument } from "./gate";

interface PlanRow extends Record<string, unknown> {
  id: string; session_id: string; input_hash: string; manifest_hash: string; created_at: string; updated_at: string; expires_at: string;
  status: CampaignStatus; reason: string | null; lease_owner: string | null; lease_until: string | null; lease_epoch: number;
  dispatch_version: number; workflow_id: string | null; document: string;
}
interface CaseRow extends Record<string, unknown> { id: string; status: CampaignCaseDTO["status"]; run_id: string; reason: string | null; document: string; result: string | null }
export interface CampaignLease { id: string; sessionId: string; owner: string; epoch: number }
export const campaignTerminal = new Set<CampaignStatus>(["completed", "cancelled", "expired", "needs_attention"]);
const now = () => new Date().toISOString();

export class CampaignStore {
  constructor(readonly lab: LabStore) {}

  async row(id: string, sessionId?: string, tx: SqlConnection = this.lab.db): Promise<PlanRow> {
    const result = await tx.query<PlanRow>(`SELECT * FROM lab_campaign_plans WHERE id=$1${sessionId ? " AND session_id=$2" : ""}`, [id, ...(sessionId ? [sessionId] : [])]);
    if (!result.rows[0]) throw new LabError("CAMPAIGN_NOT_FOUND", "This campaign does not belong to your session.", 404);
    return result.rows[0];
  }
  async event(tx: SqlConnection, id: string, kind: string, summary: string, caseId: string | null = null) {
    // Caller holds the campaign row lock. Sequence remains durable across workers.
    const count = await tx.query<{ sequence: number } & Record<string, unknown>>("SELECT COALESCE(MAX(sequence),0) AS sequence FROM lab_campaign_events_v1 WHERE campaign_id=$1", [id]);
    const sequence = Number(count.rows[0]?.sequence ?? 0) + 1;
    const event: CampaignEventDTO = { sequence, at: now(), kind, caseId, summary };
    await tx.query("INSERT INTO lab_campaign_events_v1(campaign_id,sequence,document) VALUES($1,$2,$3)", [id, sequence, JSON.stringify(event)]);
  }
  async existing(sessionId: string, requestId: string, input: unknown): Promise<CampaignLabDTO | null> {
    if (!await this.lab.session(sessionId)) throw new LabError("SESSION_EXPIRED", "The original session authority has expired.", 401);
    const rows = await this.lab.db.query<PlanRow>("SELECT * FROM lab_campaign_plans WHERE session_id=$1 AND request_id=$2", [sessionId, requestId]);
    const row = rows.rows[0];
    if (!row) return null;
    if (row.input_hash !== sha256(canonicalJson(input))) throw new LabError("CAMPAIGN_PAYLOAD_CONFLICT", "This request identity already belongs to a different campaign.", 409);
    return this.get(row.id, sessionId);
  }
  async create(sessionId: string, requestId: string, input: unknown, title: string, manifest: CampaignManifest, developerGrantId?: string): Promise<CampaignLabDTO> {
    const inputHash = sha256(canonicalJson(input));
    const id = await this.lab.db.transaction(async tx => {
      const session = await tx.query<{ expires_at: string } & Record<string, unknown>>("SELECT expires_at FROM lab_sessions WHERE id=$1 FOR UPDATE", [sessionId]);
      if (!session.rows[0] || session.rows[0].expires_at <= now()) throw new LabError("SESSION_EXPIRED", "The original session authority has expired.", 401);
      const previous = await tx.query<PlanRow>("SELECT * FROM lab_campaign_plans WHERE session_id=$1 AND request_id=$2", [sessionId, requestId]);
      if (previous.rows[0]) {
        if (previous.rows[0].input_hash !== inputHash) throw new LabError("CAMPAIGN_PAYLOAD_CONFLICT", "This request identity already belongs to a different campaign.", 409);
        return previous.rows[0].id;
      }
      const active = await tx.query("SELECT id FROM lab_campaign_plans WHERE session_id=$1 AND status IN ('queued','running','waiting')", [sessionId]);
      if (active.rowCount) throw new LabError("CAMPAIGN_ALREADY_ACTIVE", "Finish or stop the saved campaign before creating another.", 409);
      const authority = developerGrantId ? await developerCampaignAuthority(tx, sessionId, developerGrantId) : undefined;
      const boundManifest = authority ? { ...manifest, authorization: authority } : manifest;
      const expiresAt = authority && authority.expiresAt < session.rows[0].expires_at ? authority.expiresAt : session.rows[0].expires_at;
      const id = randomUUID(); const at = now(); const manifestHash = sha256(canonicalJson(boundManifest));
      await tx.query("INSERT INTO lab_campaign_plans(id,session_id,request_id,input_hash,manifest_hash,created_at,updated_at,expires_at,status,document) VALUES($1,$2,$3,$4,$5,$6,$6,$7,'queued',$8)", [id, sessionId, requestId, inputHash, manifestHash, at, expiresAt, JSON.stringify({ title, manifest: boundManifest, ...(developerGrantId ? { developerGrantId } : {}) })]);
      for (const item of manifest.cases) await tx.query("INSERT INTO lab_campaign_cases_v1(id,campaign_id,session_id,ordinal,status,run_id,document) VALUES($1,$2,$3,$4,'pending',$5,$6)", [item.id, id, sessionId, item.ordinal, item.runId, JSON.stringify(item)]);
      await this.event(tx, id, "queued", `${manifest.cases.length} immutable Sample cases were saved before execution. The original session expiry is unchanged.`);
      return id;
    });
    return this.get(id, sessionId);
  }
  async get(id: string, sessionId?: string): Promise<CampaignLabDTO> {
    const row = await this.row(id, sessionId);
    const { title, manifest } = JSON.parse(row.document) as { title: string; manifest: CampaignManifest };
    const [records, events] = await Promise.all([
      this.lab.db.query<CaseRow>("SELECT * FROM lab_campaign_cases_v1 WHERE campaign_id=$1 ORDER BY ordinal", [id]),
      this.lab.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_campaign_events_v1 WHERE campaign_id=$1 ORDER BY sequence", [id]),
    ]);
    const cases: CampaignCaseDTO[] = records.rows.map(item => ({ ...JSON.parse(item.document) as CampaignCaseSpec, status: item.status, reason: item.reason, result: item.result ? JSON.parse(item.result) as CampaignCaseResult : null }));
    const counts = { planned: cases.length, completed: 0, interrupted: 0, pending: 0, pass: 0, fail: 0, inconclusive: 0, blocked: 0, notApplicable: 0 };
    for (const item of cases) {
      if (item.status === "completed" && item.result) { counts.completed++; const key = item.result.verdict === "not_applicable" ? "notApplicable" : item.result.verdict; counts[key]++; }
      else if (item.status === "interrupted") { counts.interrupted++; counts.inconclusive++; }
      else if (["blocked", "cancelled"].includes(item.status)) counts.blocked++;
      else counts.pending++;
    }
    return { id, title, createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at, status: row.status, reason: row.reason, manifestHash: row.manifest_hash, manifest, cases, events: events.rows.map(item => JSON.parse(item.document) as CampaignEventDTO), clusters: clusterSymptoms(cases), reduction: reductionCertificate(manifest, cases), counts, activeRunId: cases.find(item => item.status === "running")?.runId ?? null, workflowId: row.workflow_id };
  }
  async list(sessionId: string): Promise<CampaignLabDTO[]> {
    const rows = await this.lab.db.query<{ id: string } & Record<string, unknown>>("SELECT id FROM lab_campaign_plans WHERE session_id=$1 ORDER BY created_at DESC LIMIT 40", [sessionId]);
    return Promise.all(rows.rows.map(row => this.get(row.id, sessionId)));
  }
  async pending(): Promise<string[]> {
    const rows = await this.lab.db.query<{ id: string } & Record<string, unknown>>("SELECT id FROM lab_campaign_plans WHERE status IN ('queued','running','waiting') ORDER BY created_at LIMIT 20");
    return rows.rows.map(row => row.id);
  }
  async dispatchIdentity(id: string) { const row = await this.row(id); return { version: row.dispatch_version, status: row.status }; }
  async recordWorkflow(id: string, version: number, workflowId: string) { await this.lab.db.query("UPDATE lab_campaign_plans SET workflow_id=$3 WHERE id=$1 AND dispatch_version=$2", [id, version, workflowId]); }
  async continuationStopped(id: string, version: number, workflowId: string, status: string) {
    return this.lab.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_campaign_plans WHERE id=$1 FOR UPDATE", [id]);
      const row = await this.row(id, undefined, tx);
      if (campaignTerminal.has(row.status) || row.dispatch_version !== version || row.workflow_id && row.workflow_id !== workflowId || row.lease_until && row.lease_until > now()) return false;
      const reason = `The durable continuation ended (${status}) before the campaign queue finished. Original case identities and evidence remain saved. Resume to inspect the original execution and continue only admissible remaining work.`;
      await tx.query("UPDATE lab_campaign_plans SET status='needs_attention',reason=$2,lease_owner=NULL,lease_until=NULL,workflow_id=$3,updated_at=$4 WHERE id=$1", [id, reason, workflowId, now()]);
      await this.event(tx, id, "continuation_stopped", reason);
      return true;
    });
  }
  async claim(id: string): Promise<CampaignLease | null> {
    return this.lab.db.transaction(async tx => {
      await tx.query("SELECT id FROM lab_campaign_plans WHERE id=$1 FOR UPDATE", [id]);
      const row = await this.row(id, undefined, tx);
      if (campaignTerminal.has(row.status)) return null;
      const session = await tx.query<{ expires_at: string } & Record<string, unknown>>("SELECT expires_at FROM lab_sessions WHERE id=$1", [row.session_id]);
      if (row.expires_at <= now() || !session.rows[0] || session.rows[0].expires_at <= now()) { await this.terminate(tx, row, "expired", "The original session expired. No deadline or authority was renewed."); return null; }
      try { await assertCampaignGrant(tx, row.session_id, JSON.parse(row.document) as CampaignDocument); }
      catch (error) { if (!(error instanceof LabError) || error.code !== "CAMPAIGN_AUTHORITY_REVOKED") throw error; await this.terminate(tx, row, "cancelled", "The original private developer grant was revoked or expired. Queued work stopped; all existing observations remain available."); return null; }
      if (row.lease_owner && row.lease_until && row.lease_until > now()) return null;
      const lease = { id, sessionId: row.session_id, owner: randomUUID(), epoch: row.lease_epoch + 1 };
      await tx.query("UPDATE lab_campaign_plans SET status='running',reason=NULL,lease_owner=$2,lease_until=$3,lease_epoch=$4,updated_at=$5 WHERE id=$1", [id, lease.owner, new Date(Date.now() + 120_000).toISOString(), lease.epoch, now()]);
      return lease;
    });
  }
  async fenced(tx: SqlConnection, lease: CampaignLease): Promise<PlanRow> {
    await tx.query("SELECT id FROM lab_campaign_plans WHERE id=$1 FOR UPDATE", [lease.id]);
    const row = await this.row(lease.id, lease.sessionId, tx);
    if (row.status !== "running" || row.lease_owner !== lease.owner || row.lease_epoch !== lease.epoch || !row.lease_until || row.lease_until <= now() || row.expires_at <= now()) throw new LabError("CAMPAIGN_LEASE_LOST", "The original campaign worker no longer has execution authority.", 409);
    return row;
  }
  async beginCase(lease: CampaignLease, item: CampaignCaseDTO) {
    await this.lab.db.transaction(async tx => {
      await this.fenced(tx, lease);
      const changed = await tx.query("UPDATE lab_campaign_cases_v1 SET status='running',reason=NULL WHERE id=$1 AND campaign_id=$2 AND status='pending'", [item.id, lease.id]);
      if (changed.rowCount) await this.event(tx, lease.id, "case_started", `${item.scenarioId} · ${item.revision}: the original case and run identity were claimed.`, item.id);
    });
  }
  async settleCase(lease: CampaignLease, item: CampaignCaseDTO, result: CampaignCaseResult, interrupted = false) {
    await this.lab.db.transaction(async tx => {
      await this.fenced(tx, lease);
      const changed = await tx.query("UPDATE lab_campaign_cases_v1 SET status=$3,result=$4,reason=$5 WHERE id=$1 AND campaign_id=$2 AND status='running'", [item.id, lease.id, interrupted ? "interrupted" : "completed", JSON.stringify(result), interrupted ? "The original execution was interrupted; its effects were not replayed." : null]);
      if (changed.rowCount) await this.event(tx, lease.id, interrupted ? "case_interrupted" : "case_completed", interrupted ? "Original partial observations retained. This case cannot count as a passing result." : `${item.scenarioId} · ${item.revision}: ${result.verdict}, ${result.eventCount} persisted observations.`, item.id);
    });
  }
  async release(lease: CampaignLease, status: CampaignStatus, reason: string | null = null) {
    await this.lab.db.transaction(async tx => {
      await this.fenced(tx, lease);
      await tx.query("UPDATE lab_campaign_plans SET status=$2,reason=$3,lease_owner=NULL,lease_until=NULL,updated_at=$4 WHERE id=$1", [lease.id, status, reason, now()]);
      if (["completed", "needs_attention"].includes(status)) await this.event(tx, lease.id, status, reason ?? "Every planned case has a terminal record. Coverage uses only those recorded outcomes.");
    });
  }
  async terminate(tx: SqlConnection, row: PlanRow, status: "cancelled" | "expired", reason: string) {
    const cases = await tx.query<CaseRow>("SELECT * FROM lab_campaign_cases_v1 WHERE campaign_id=$1 AND status IN ('pending','running')", [row.id]);
    for (const item of cases.rows) {
      const runs = await tx.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [item.run_id, row.session_id]);
      let retained = runs.rows[0] ? JSON.parse(runs.rows[0].document) as RunDTO : null;
      if (retained) {
        if (!["completed", "inconclusive", "failed_infrastructure", "cancelled_reconciled", "cancelled_uncertain"].includes(retained.stage)) {
          const resources = await this.lab.resources(item.run_id, tx);
          const projection = await this.lab.projection(retained, tx);
          retained = { ...retained, ...projection, stage: "cancelled_uncertain", verdict: "inconclusive", updatedAt: now(), summary: "Campaign authority ended. Partial observations are retained without a completed target verdict.", nextAction: "Inspect retained evidence", limitations: [...retained.limitations, "Campaign cancellation is not payment reconciliation or compensation. Later observations cannot turn this interrupted case into a passing case."], orderIds: resources.filter(resource => resource.kind === "order").map(resource => resource.id), captures: resources.filter(resource => resource.kind === "capture").map(resource => ({ id: resource.id, orderId: resource.parentId ?? "", status: resource.status, amountMinor: resource.money?.minor ?? 0, currency: resource.money?.currency ?? retained!.currency, observedAt: resource.observedAt, source: resource.source, evidenceId: retained!.events.find(event => event.resourceId === resource.id && event.lane === "provider")?.evidenceIds[0] ?? "" })), refunds: resources.filter(resource => resource.kind === "refund").map(resource => ({ id: resource.id, captureId: resource.parentId ?? "", status: resource.status, amountMinor: resource.money?.minor ?? 0, currency: resource.money?.currency ?? retained!.currency, observedAt: resource.observedAt, source: resource.source, evidenceId: retained!.events.find(event => event.resourceId === resource.id && event.lane === "provider")?.evidenceIds[0] ?? "" })) };
          await tx.query("UPDATE lab_runs SET cancelled=1,stage=$3,checkpoint='campaign_stopped',updated_at=$4,document=$5,version=version+1 WHERE id=$1 AND session_id=$2", [item.run_id, row.session_id, retained.stage, retained.updatedAt, JSON.stringify(retained)]);
        } else await tx.query("UPDATE lab_runs SET cancelled=1 WHERE id=$1 AND session_id=$2", [item.run_id, row.session_id]);
        await tx.query("UPDATE lab_jobs SET stage='cancelled',lease_owner=NULL,lease_until=NULL WHERE run_id=$1 AND session_id=$2 AND stage IN ('queued','running')", [item.run_id, row.session_id]);
      }
      const result = retained ? caseResult(retained) : null;
      await tx.query("UPDATE lab_campaign_cases_v1 SET status=$2,reason=$3,result=$4 WHERE id=$1", [item.id, runs.rows[0] ? "interrupted" : "cancelled", reason, result ? JSON.stringify(result) : null]);
    }
    await tx.query("UPDATE lab_campaign_plans SET status=$2,reason=$3,lease_owner=NULL,lease_until=NULL,updated_at=$4 WHERE id=$1", [row.id, status, reason, now()]);
    await this.event(tx, row.id, status, reason);
  }
  async command(sessionId: string, id: string, action: "cancel" | "resume", requestId: string) {
    if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(requestId) || !["cancel", "resume"].includes(action)) throw new LabError("CAMPAIGN_COMMAND_INVALID", "Use a stable bounded command identity.");
    await this.lab.db.transaction(async tx => {
      const sessions = await tx.query<{ expires_at: string } & Record<string, unknown>>("SELECT expires_at FROM lab_sessions WHERE id=$1 FOR UPDATE", [sessionId]);
      await tx.query("SELECT id FROM lab_campaign_plans WHERE id=$1 AND session_id=$2 FOR UPDATE", [id, sessionId]);
      const row = await this.row(id, sessionId, tx);
      const hash = sha256(canonicalJson({ id, action }));
      const old = await tx.query<{ input_hash: string } & Record<string, unknown>>("SELECT input_hash FROM lab_campaign_commands_v1 WHERE session_id=$1 AND request_id=$2", [sessionId, requestId]);
      if (old.rows[0]) { if (old.rows[0].input_hash !== hash) throw new LabError("CAMPAIGN_COMMAND_CONFLICT", "This command identity belongs to another action.", 409); return; }
      if (row.expires_at <= now() || !sessions.rows[0] || sessions.rows[0].expires_at <= now()) throw new LabError("SESSION_EXPIRED", "The original session has expired; its authority cannot be extended.", 401);
      if (action === "cancel" && !["completed", "cancelled", "expired"].includes(row.status)) await this.terminate(tx, row, "cancelled", "Stopped by the session owner. Existing resources and all partial observations are retained; no compensation was submitted.");
      if (action === "resume") {
        await assertCampaignGrant(tx, sessionId, JSON.parse(row.document) as CampaignDocument);
        if (!["waiting", "needs_attention", "queued"].includes(row.status)) throw new LabError("CAMPAIGN_NOT_RESUMABLE", "This campaign has no remaining work that can be resumed.", 409);
        await tx.query("UPDATE lab_campaign_plans SET status='queued',reason=NULL,lease_owner=NULL,lease_until=NULL,dispatch_version=dispatch_version+1,workflow_id=NULL,updated_at=$2 WHERE id=$1", [id, now()]);
        await this.event(tx, id, "resumed", "Continue unstarted cases under the original manifest and expiry. Interrupted cases are not rerun.");
      }
      await tx.query("INSERT INTO lab_campaign_commands_v1(session_id,request_id,campaign_id,input_hash,created_at) VALUES($1,$2,$3,$4,$5)", [sessionId, requestId, id, hash, now()]);
    });
    return this.get(id, sessionId);
  }
}
