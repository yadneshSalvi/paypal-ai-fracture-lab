import { randomUUID } from "node:crypto";
import type { SqlConnection } from "@fracture/paypal-core";
import type { LabStore } from "../../service/src/store";
import { SourceAccessStore } from "../../source-access/src/store";
import { sourceExecutionOwnerSchema, sourcePrepareSchema, sourceApproveSchema, sourceCancelSchema, runnerIdentitySchema, sourcePlanIdSchema, sourceJobIdSchema, sourceListSchema } from "./schemas";
import type { SourceExecutionOwner, SourcePrepareInput, SourceApproveInput, SourceCancelInput, SourcePlan, SourceRunnerIdentity, SourceCommandReceipt, SourceJobDTO, SourceCaseDTO, SourceExecutionClaim, SourceExecutor, SourceExecutionBundle, SourceExecutionReceipt, SourceExecutionEvent, SourceJobState } from "./schemas";
import { verifySourceExecutionAuthority, verifySourceImportBinding } from "./authority";
import type { SourceAuthorityVerifier } from "./authority";
import { closureFromSnapshot, verifyPlan, verifyBundle } from "./closure";
import { verifySourceReceipt } from "./receipt";
import { canonical, objectHash } from "./hash";
import { PUBLIC_SUITE_HASH, SOURCE_EXECUTION_PROTOCOL, SOURCE_ADAPTER_VERSION, SOURCE_LIMITS, SOURCE_LIMITATIONS } from "./limits";
import { SCENARIO_MANIFEST_HASH, sourceScenario } from "./suite";
import { SourceExecutionError, executionDenied, integrityFailed } from "./errors";
type Row = Record<string, unknown>;
interface PlanRow extends Row { id: string; session_id: string; grant_id: string; import_id: string; document: string; document_hash: string }
interface CommandRow extends Row { session_id: string; grant_id: string; request_id: string; action: string; input_hash: string; import_id: string; document: string; document_hash: string }
interface JobRow extends Row { id: string; plan_id: string; session_id: string; grant_id: string; import_id: string; plan_hash: string; status: SourceJobState; created_at: string; expires_at: string; cancelled_at: string | null; finished_at: string | null; error_code: string | null; worker_id: string | null; claim_token: string | null; lease_until: string | null; event_sequence: number }
interface CaseRow extends Row { id: string; job_id: string; position: number; scenario_id: SourceCaseDTO["scenarioId"]; status: SourceCaseDTO["status"]; execution_id: string; dispatched_at: string | null; finished_at: string | null; receipt_hash: string | null; error_code: string | null; bundle_document: string | null; bundle_hash: string | null }
const terminal = new Set<SourceJobState>(["passed", "failed", "inconclusive", "cancelled_confirmed", "cancelled_uncertain"]);
const iso = (value: number) => new Date(value).toISOString();
const parse = <T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown): T => { const parsed = schema.safeParse(value); if (!parsed.success) throw new SourceExecutionError("SOURCE_EXECUTION_INPUT_INVALID", "Use the exact source execution schema, hashes and original request UUID.", 400); return parsed.data; };
/** All source-bearing methods are private-owner scoped. This service never executes imported code itself. */
export class SourceExecutionService {
  readonly runner: SourceRunnerIdentity;
  readonly now: () => number;
  private readonly active = new Map<string, AbortController>();
  constructor(readonly lab: LabStore, readonly sources: SourceAccessStore, runner: SourceRunnerIdentity, readonly options: { now?: () => number; verifyAuthority?: SourceAuthorityVerifier } = {}) {
    this.runner = runnerIdentitySchema.parse(runner); this.now = options.now ?? Date.now;
    if (this.runner.suiteHash !== PUBLIC_SUITE_HASH) throw integrityFailed();
  }
  private async authority(tx: SqlConnection, owner: SourceExecutionOwner, importId: string, expected: SourcePlan["authority"] | null = null) {
    const actual = await verifySourceExecutionAuthority(tx, owner, importId, expected, this.now());
    if (this.options.verifyAuthority) {
      const additional = await this.options.verifyAuthority(tx, owner, importId, expected, this.now());
      if (canonical(additional) !== canonical(actual)) throw executionDenied();
    }
    return actual;
  }
  private async plan(tx: SqlConnection, id: string): Promise<{ row: PlanRow; plan: SourcePlan }> {
    const row = (await tx.query<PlanRow>("SELECT * FROM lab_source_execution_plans_v1 WHERE id=$1", [id])).rows[0]; if (!row) throw executionDenied();
    let value: unknown; try { value = JSON.parse(row.document); } catch { throw integrityFailed(); }
    if (objectHash(value) !== row.document_hash) throw integrityFailed();
    const plan = verifyPlan(value);
    if (plan.id !== row.id || plan.importId !== row.import_id || plan.authority.sessionId !== row.session_id) throw integrityFailed();
    return { row, plan };
  }
  private async ownedPlan(tx: SqlConnection, owner: SourceExecutionOwner, id: string) {
    const value = await this.plan(tx, id);
    if (value.row.session_id !== owner.sessionId || value.row.grant_id !== owner.grantId) throw executionDenied();
    await this.authorityPlan(tx, owner, value.plan); return value;
  }
  private async authorityPlan(tx: SqlConnection, owner: SourceExecutionOwner, plan: SourcePlan, execution = false) {
    if (execution && Date.parse(plan.expiresAt) <= this.now()) throw new SourceExecutionError("SOURCE_EXECUTION_PLAN_EXPIRED", "The original execution window expired. Historical evidence remains readable only within the original current authority.");
    await this.authority(tx, owner, plan.importId, plan.authority); await verifySourceImportBinding(tx, plan);
  }
  private async command(tx: SqlConnection, owner: SourceExecutionOwner, requestId: string, action?: SourceCommandReceipt["action"], inputHash?: string) {
    const row = (await tx.query<CommandRow>("SELECT * FROM lab_source_execution_commands_v1 WHERE session_id=$1 AND request_id=$2", [owner.sessionId, requestId])).rows[0];
    if (!row) return null;
    if (row.grant_id !== owner.grantId || action && row.action !== action || inputHash && row.input_hash !== inputHash) throw new SourceExecutionError("SOURCE_EXECUTION_REQUEST_CONFLICT", "This request UUID is already bound to another immutable command.");
    let receipt: SourceCommandReceipt; try { receipt = JSON.parse(row.document) as SourceCommandReceipt; } catch { throw integrityFailed(); }
    if (objectHash(receipt) !== row.document_hash || receipt.requestId !== row.request_id || receipt.action !== row.action || receipt.inputHash !== row.input_hash) throw integrityFailed();
    return { receipt, importId: row.import_id };
  }
  private async saveCommand(tx: SqlConnection, owner: SourceExecutionOwner, importId: string, receipt: SourceCommandReceipt) {
    await tx.query("INSERT INTO lab_source_execution_commands_v1(session_id,grant_id,request_id,action,input_hash,import_id,document,document_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [owner.sessionId, owner.grantId, receipt.requestId, receipt.action, receipt.inputHash, importId, JSON.stringify(receipt), objectHash(receipt)]);
    return receipt;
  }
  private rejected(receipt: SourceCommandReceipt): never { throw new SourceExecutionError(receipt.errorCode ?? "SOURCE_EXECUTION_REJECTED", receipt.message ?? "The original execution command was rejected.", 422); }
  async getCommand(ownerInput: SourceExecutionOwner, requestId: string): Promise<SourceCommandReceipt | null> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput);
    if (!/^[a-f0-9-]{36}$/i.test(requestId)) throw new SourceExecutionError("SOURCE_EXECUTION_INPUT_INVALID", "Use the original command UUID.", 400);
    return this.lab.db.transaction(async tx => { const old = await this.command(tx, owner, requestId); if (!old) return null; await this.authority(tx, owner, old.importId); return old.receipt; });
  }
  async prepare(ownerInput: SourceExecutionOwner, inputValue: SourcePrepareInput): Promise<{ command: SourceCommandReceipt; plan: SourcePlan }> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourcePrepareSchema, inputValue), inputHash = objectHash(input);
    const old = await this.lab.db.transaction(async tx => { await this.authority(tx, owner, input.importId); return this.command(tx, owner, input.requestId, "prepare", inputHash); });
    if (old) { if (old.receipt.status === "rejected") this.rejected(old.receipt); return { command: old.receipt, plan: await this.getPlan(owner, { planId: old.receipt.resourceId! }) }; }
    let closure: SourcePlan["closure"], snapshot: NonNullable<Awaited<ReturnType<SourceAccessStore["report"]>>["view"]["snapshot"]>;
    try {
      const report = await this.sources.report(owner.sessionId, input.importId);
      if (report.view.import.access !== "owner" || report.view.snapshot?.revisionHash !== input.expectedRevisionHash) throw new SourceExecutionError("SOURCE_EXECUTION_REVISION_MISMATCH", "Use the exact revision hash of the owned accepted source import.");
      snapshot = report.view.snapshot; closure = closureFromSnapshot(report, input.entryPath);
    } catch (error) {
      if (!(error instanceof SourceExecutionError)) throw error;
      const receipt = await this.lab.db.transaction(async tx => {
        await this.authority(tx, owner, input.importId); const winner = await this.command(tx, owner, input.requestId, "prepare", inputHash); if (winner) return winner.receipt;
        return this.saveCommand(tx, owner, input.importId, { requestId: input.requestId, action: "prepare", inputHash, acceptedAt: iso(this.now()), status: "rejected", resourceId: null, errorCode: error.code, message: error.message });
      });
      if (receipt.status === "rejected") this.rejected(receipt);
      return { command: receipt, plan: await this.getPlan(owner, { planId: receipt.resourceId! }) };
    }
    return this.lab.db.transaction(async tx => {
      const authority = await this.authority(tx, owner, input.importId), winner = await this.command(tx, owner, input.requestId, "prepare", inputHash);
      if (winner) { if (winner.receipt.status === "rejected") this.rejected(winner.receipt); return { command: winner.receipt, plan: (await this.ownedPlan(tx, owner, winner.receipt.resourceId!)).plan }; }
      const at = this.now(); const body = { protocol: SOURCE_EXECUTION_PROTOCOL, id: randomUUID(), importId: input.importId, snapshotId: snapshot!.id, revisionHash: snapshot!.revisionHash, sourceManifestHash: snapshot!.manifestHash, createdAt: iso(at), expiresAt: iso(Math.min(at + SOURCE_LIMITS.planLifetimeMs, Date.parse(authority.expiresAt))), authority, entryPath: input.entryPath, exportName: "checkout" as const, adapterVersion: SOURCE_ADAPTER_VERSION, adapterHash: this.runner.adapterHash, suiteHash: PUBLIC_SUITE_HASH, scenarioManifestHash: SCENARIO_MANIFEST_HASH, scenarioIds: input.scenarioIds, seed: input.seed, runner: this.runner, closure, limitations: [...SOURCE_LIMITATIONS] };
      const plan = verifyPlan({ ...body, planHash: objectHash(body) }); await verifySourceImportBinding(tx, plan);
      await tx.query("INSERT INTO lab_source_execution_plans_v1(id,session_id,grant_id,import_id,created_at,expires_at,document,document_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [plan.id, owner.sessionId, owner.grantId, plan.importId, plan.createdAt, plan.expiresAt, JSON.stringify(plan), objectHash(plan)]);
      const command = await this.saveCommand(tx, owner, plan.importId, { requestId: input.requestId, action: "prepare", inputHash, acceptedAt: plan.createdAt, status: "accepted", resourceId: plan.id, errorCode: null, message: null }); return { command, plan };
    });
  }
  async getPlan(ownerInput: SourceExecutionOwner, inputValue: { planId: string }): Promise<SourcePlan> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourcePlanIdSchema, inputValue);
    return this.lab.db.transaction(async tx => (await this.ownedPlan(tx, owner, input.planId)).plan);
  }
  private async job(tx: SqlConnection, id: string) { const row = (await tx.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE id=$1", [id])).rows[0]; if (!row) throw executionDenied(); return row; }
  private async lockedJob(tx: SqlConnection, id: string) { const row = (await tx.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE id=$1 FOR UPDATE", [id])).rows[0]; if (!row) throw executionDenied(); return row; }
  private async cases(tx: SqlConnection, id: string) { return (await tx.query<CaseRow>("SELECT * FROM lab_source_execution_cases_v1 WHERE job_id=$1 ORDER BY position", [id])).rows; }
  private verifyCaseManifest(plan: SourcePlan, rows: CaseRow[]) {
    if (plan.scenarioManifestHash !== SCENARIO_MANIFEST_HASH || rows.length !== plan.scenarioIds.length || rows.some((row,index) => Number(row.position) !== index || row.scenario_id !== plan.scenarioIds[index] || row.execution_id !== "fracture-source-" + row.id)) throw integrityFailed();
  }
  private async dto(tx: SqlConnection, row: JobRow): Promise<SourceJobDTO> {
    return { id: row.id, planId: row.plan_id, planHash: row.plan_hash, importId: row.import_id, status: row.status, createdAt: row.created_at, expiresAt: row.expires_at, cancelledAt: row.cancelled_at, finishedAt: row.finished_at, errorCode: row.error_code, cases: (await this.cases(tx, row.id)).map(item => ({ id: item.id, scenarioId: item.scenario_id, status: item.status, executionId: item.execution_id, dispatchedAt: item.dispatched_at, finishedAt: item.finished_at, receiptHash: item.receipt_hash, errorCode: item.error_code })) };
  }
  private async emit(tx: SqlConnection, row: JobRow, kind: string, detail: string, caseId: string | null = null) {
    const latest = await this.lockedJob(tx, row.id), sequence = Number(latest.event_sequence) + 1;
    const value = { id: randomUUID(), sequence, jobId: row.id, at: iso(this.now()), kind, caseId, detail };
    const event: SourceExecutionEvent = { ...value, digest: objectHash(value) };
    await tx.query("UPDATE lab_source_execution_jobs_v1 SET event_sequence=$2 WHERE id=$1", [row.id, sequence]);
    await tx.query("INSERT INTO lab_source_execution_events_v1(id,job_id,sequence,document,document_hash) VALUES($1,$2,$3,$4,$5)", [event.id, row.id, sequence, JSON.stringify(event), objectHash(event)]);
  }
  async approve(ownerInput: SourceExecutionOwner, inputValue: SourceApproveInput): Promise<{ command: SourceCommandReceipt; job: SourceJobDTO }> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourceApproveSchema, inputValue), inputHash = objectHash(input);
    return this.lab.db.transaction(async tx => {
      const { plan } = await this.ownedPlan(tx, owner, input.planId);
      const old = await this.command(tx, owner, input.requestId, "approve", inputHash);
      if (old) { if (old.receipt.status === "rejected") this.rejected(old.receipt); return { command: old.receipt, job: await this.dto(tx, await this.job(tx, old.receipt.resourceId!)) }; }
      if (plan.planHash !== input.expectedPlanHash || canonical(plan.runner) !== canonical(this.runner)) throw new SourceExecutionError("SOURCE_EXECUTION_PLAN_MISMATCH", "Approve the exact current source plan and qualified runner identity.");
      await this.authorityPlan(tx, owner, plan, true);
      const existing = (await tx.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE plan_id=$1", [plan.id])).rows[0];
      if (existing) throw new SourceExecutionError("SOURCE_EXECUTION_ALREADY_APPROVED", "This plan already has an immutable job. Recover its original approval command and job; do not dispatch another execution.");
      const id = randomUUID(), at = iso(this.now());
      await tx.query("INSERT INTO lab_source_execution_jobs_v1(id,plan_id,session_id,grant_id,import_id,plan_hash,status,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,'queued',$7,$8)", [id, plan.id, owner.sessionId, owner.grantId, plan.importId, plan.planHash, at, plan.expiresAt]);
      for (const [position, scenarioId] of plan.scenarioIds.entries()) { const caseId = randomUUID(); await tx.query("INSERT INTO lab_source_execution_cases_v1(id,job_id,position,scenario_id,status,execution_id) VALUES($1,$2,$3,$4,'pending',$5)", [caseId, id, position, scenarioId, "fracture-source-" + caseId]); }
      const command = await this.saveCommand(tx, owner, plan.importId, { requestId: input.requestId, action: "approve", inputHash, acceptedAt: at, status: "accepted", resourceId: id, errorCode: null, message: null });
      const row = await this.job(tx, id); await this.emit(tx, row, "approved", "The original owner explicitly approved this exact source/adapter/suite/runner plan. No code has run."); return { command, job: await this.dto(tx, await this.job(tx, id)) };
    });
  }
  async getJob(ownerInput: SourceExecutionOwner, inputValue: { jobId: string }): Promise<SourceJobDTO> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourceJobIdSchema, inputValue);
    return this.lab.db.transaction(async tx => { const row = await this.job(tx, input.jobId); await this.ownedPlan(tx, owner, row.plan_id); return this.dto(tx, row); });
  }
  async list(ownerInput: SourceExecutionOwner, inputValue: { limit?: number } = {}) {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourceListSchema, inputValue);
    return this.lab.db.transaction(async tx => {
      const rows = (await tx.query<PlanRow>("SELECT * FROM lab_source_execution_plans_v1 WHERE session_id=$1 AND grant_id=$2 ORDER BY created_at DESC LIMIT $3", [owner.sessionId, owner.grantId, input.limit])).rows;
      const plans: Omit<SourcePlan, "closure">[] = [], jobs: SourceJobDTO[] = [];
      for (const row of rows) {
        try { const { plan } = await this.ownedPlan(tx, owner, row.id); const { closure: _closure, ...summary } = plan; plans.push(summary); const job = (await tx.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE plan_id=$1", [plan.id])).rows[0]; if (job) jobs.push(await this.dto(tx, job)); }
        catch (error) { if (!(error instanceof SourceExecutionError) || error.code !== "SOURCE_EXECUTION_ACCESS_DENIED") throw error; }
      }
      if (!rows.length) { const session = (await tx.query<{ role: string; expires_at: string } & Row>("SELECT role,expires_at FROM lab_sessions WHERE id=$1", [owner.sessionId])).rows[0], grant = (await tx.query<{ session_id: string; revoked_at: string | null; expires_at: string } & Row>("SELECT session_id,revoked_at,expires_at FROM lab_developer_grants WHERE id=$1", [owner.grantId])).rows[0]; if (!session || session.role !== "owner" || !grant || grant.session_id !== owner.sessionId || grant.revoked_at || Date.parse(session.expires_at) <= this.now() || Date.parse(grant.expires_at) <= this.now()) throw executionDenied(); }
      return { plans, jobs, scope: "private_source_execution" as const, arbitrarySourceExecution: false as const };
    });
  }
  async report(ownerInput: SourceExecutionOwner, inputValue: { jobId: string }) {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourceJobIdSchema, inputValue);
    return this.lab.db.transaction(async tx => {
      const row = await this.job(tx, input.jobId), { plan } = await this.ownedPlan(tx, owner, row.plan_id);
      const artifacts = (await tx.query<{ kind: string; document: string; document_hash: string } & Row>("SELECT kind,document,document_hash FROM lab_source_execution_artifacts_v1 WHERE job_id=$1 ORDER BY created_at,id", [row.id])).rows.map(item => { const value: unknown = JSON.parse(item.document); if (objectHash(value) !== item.document_hash) throw integrityFailed(); return { kind: item.kind, digest: item.document_hash, value }; });
      const events = (await tx.query<{ document: string; document_hash: string } & Row>("SELECT document,document_hash FROM lab_source_execution_events_v1 WHERE job_id=$1 ORDER BY sequence", [row.id])).rows.map(item => { const value: unknown = JSON.parse(item.document); if (objectHash(value) !== item.document_hash) throw integrityFailed(); return value; });
      const body = { protocol: SOURCE_EXECUTION_PROTOCOL, exportedAt: iso(this.now()), privacy: "private_source_bearing" as const, plan, job: await this.dto(tx, row), events, artifacts, originalImportExecution: "static_only" as const, providerCalls: 0, modelCalls: 0 };
      return { ...body, reportHash: objectHash(body) };
    });
  }
  async cancel(ownerInput: SourceExecutionOwner, inputValue: SourceCancelInput): Promise<{ command: SourceCommandReceipt; job: SourceJobDTO }> {
    const owner = parse(sourceExecutionOwnerSchema, ownerInput), input = parse(sourceCancelSchema, inputValue), inputHash = objectHash(input);
    const result = await this.lab.db.transaction(async tx => {
      let row = await this.job(tx, input.jobId); await this.ownedPlan(tx, owner, row.plan_id); row = await this.lockedJob(tx, row.id);
      const old = await this.command(tx, owner, input.requestId, "cancel", inputHash); if (old) return { command: old.receipt, job: await this.dto(tx, row) };
      const at = iso(this.now());
      if (!terminal.has(row.status)) {
        const inflight = (await this.cases(tx, row.id)).some(item => item.status === "dispatched");
        await tx.query("UPDATE lab_source_execution_jobs_v1 SET cancelled_at=$2,status=$3,finished_at=$4 WHERE id=$1", [row.id, row.cancelled_at ?? at, inflight ? "cancel_requested" : "cancelled_confirmed", inflight ? null : at]);
        await tx.query("UPDATE lab_source_execution_cases_v1 SET status='cancelled',finished_at=$2,error_code='SOURCE_EXECUTION_CANCELLED_BEFORE_DISPATCH' WHERE job_id=$1 AND status='pending'", [row.id, at]);
        await this.emit(tx, row, "cancel_requested", "Cancellation stops later cases and aborts the owned runtime. Completed and uncertain observations remain retained.");
      }
      const command = await this.saveCommand(tx, owner, row.import_id, { requestId: input.requestId, action: "cancel", inputHash, acceptedAt: at, status: "accepted", resourceId: row.id, errorCode: null, message: null }); return { command, job: await this.dto(tx, await this.job(tx, row.id)) };
    });
    this.active.get(input.jobId)?.abort(new SourceExecutionError("SOURCE_EXECUTION_CANCELLED", "The owner requested cancellation.")); return result;
  }
  private async artifact(tx: SqlConnection, row: JobRow, caseId: string, kind: string, value: unknown) {
    await tx.query("INSERT INTO lab_source_execution_artifacts_v1(id,job_id,case_id,kind,created_at,document,document_hash) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(case_id,kind) DO NOTHING", [randomUUID(), row.id, caseId, kind, iso(this.now()), JSON.stringify(value), objectHash(value)]);
  }
  private async stop(tx: SqlConnection, row: JobRow, code: string, uncertain: boolean) {
    row = await this.lockedJob(tx, row.id); if (terminal.has(row.status)) return;
    const at = iso(this.now()), cancelled = Boolean(row.cancelled_at);
    await tx.query("UPDATE lab_source_execution_cases_v1 SET status='inconclusive',finished_at=$2,error_code=$3 WHERE job_id=$1 AND status='dispatched'", [row.id, at, code]);
    await tx.query("UPDATE lab_source_execution_cases_v1 SET status='cancelled',finished_at=$2,error_code=$3 WHERE job_id=$1 AND status='pending'", [row.id, at, code]);
    await tx.query("UPDATE lab_source_execution_jobs_v1 SET status=$2,finished_at=$3,error_code=$4 WHERE id=$1", [row.id, cancelled ? uncertain ? "cancelled_uncertain" : "cancelled_confirmed" : uncertain ? "inconclusive" : "cancelled_confirmed", at, code]);
    await this.emit(tx, row, uncertain ? "execution_unknown" : "execution_stopped", "The original execution cannot admit more cases. Original identities, observations and uncertain outcomes are retained.");
  }
  async claimNext(workerId: string, options: { jobId?: string; maximumCases?: number } = {}): Promise<SourceExecutionClaim | null> {
    if (options.jobId !== undefined) parse(sourceJobIdSchema, { jobId: options.jobId });
    if (options.maximumCases !== undefined && (!Number.isInteger(options.maximumCases) || options.maximumCases < 1 || options.maximumCases > 9)) throw new SourceExecutionError("SOURCE_EXECUTION_STEP_LIMIT", "A durable step must admit between one and nine cases.", 400);
    if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(workerId)) throw new SourceExecutionError("SOURCE_EXECUTION_WORKER_INVALID", "Use a bounded trusted worker identity.", 400);
    const stale = (await this.lab.db.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE status IN ('claimed','running','cancel_requested') AND lease_until<=$1", [iso(this.now())])).rows;
    for (const candidate of stale) await this.lab.db.transaction(async tx => { const row = await this.lockedJob(tx, candidate.id); if (["claimed", "running", "cancel_requested"].includes(row.status) && row.lease_until && Date.parse(row.lease_until) <= this.now()) await this.stop(tx, row, "SOURCE_EXECUTION_LEASE_OUTCOME_UNKNOWN", true); });
    return this.lab.db.transaction(async tx => {
      const rows = (await tx.query<JobRow>("SELECT * FROM lab_source_execution_jobs_v1 WHERE status='queued'" + (options.jobId ? " AND id=$1" : "") + " ORDER BY created_at,id LIMIT 100", options.jobId ? [options.jobId] : [])).rows;
      for (const row of rows) {
        const { plan } = await this.plan(tx, row.plan_id), owner = { sessionId: row.session_id, grantId: row.grant_id };
        try { await this.authorityPlan(tx, owner, plan, true); this.verifyCaseManifest(plan, await this.cases(tx, row.id)); }
        catch (error) { if (!(error instanceof SourceExecutionError)) throw error; await this.stop(tx, row, error.code, false); continue; }
        if (canonical(plan.runner) !== canonical(this.runner)) { await this.stop(tx, row, "SOURCE_EXECUTION_RUNNER_CHANGED", false); continue; }
        const token = randomUUID(), leaseUntil = iso(Math.min(Date.parse(plan.expiresAt), this.now() + (SOURCE_LIMITS.caseDeadlineMs + 10_000) * Math.min(options.maximumCases ?? 9, plan.scenarioIds.length) + 10_000));
        const changed = await tx.query("UPDATE lab_source_execution_jobs_v1 SET status='claimed',worker_id=$2,claim_token=$3,lease_until=$4 WHERE id=$1 AND status='queued'", [row.id, workerId, token, leaseUntil]);
        if (changed.rowCount !== 1) continue;
        await this.emit(tx, row, "claimed", "One trusted worker claimed this immutable job. This claim is never reused to redispatch uncertain source execution.");
        return { jobId: row.id, workerId, token, leaseUntil };
      }
      return null;
    });
  }
  private async claimRow(tx: SqlConnection, claim: SourceExecutionClaim, plan: SourcePlan) {
    let row = await this.job(tx, claim.jobId);
    await this.authorityPlan(tx, { sessionId: row.session_id, grantId: row.grant_id }, plan, true);
    row = await this.lockedJob(tx, row.id);
    if (row.worker_id !== claim.workerId || row.claim_token !== claim.token || row.lease_until !== claim.leaseUntil || !["claimed", "running", "cancel_requested"].includes(row.status) || Date.parse(claim.leaseUntil) <= this.now() || row.plan_hash !== plan.planHash) throw new SourceExecutionError("SOURCE_EXECUTION_CLAIM_LOST", "The original claim is unavailable; no case may be redispatched.");
    if (row.cancelled_at) throw new SourceExecutionError("SOURCE_EXECUTION_CANCELLED", "Cancellation prevents another case.");
    return row;
  }
  async executeClaim(claim: SourceExecutionClaim, executor: SourceExecutor, options: { maximumCases?: number } = {}): Promise<SourceJobDTO> {
    const maximumCases = options.maximumCases ?? 9;
    if (!Number.isInteger(maximumCases) || maximumCases < 1 || maximumCases > 9) throw new SourceExecutionError("SOURCE_EXECUTION_STEP_LIMIT", "A durable step must admit between one and nine cases.", 400);
    const begun = await this.lab.db.transaction(async tx => {
      const row = await this.job(tx, claim.jobId), { plan } = await this.plan(tx, row.plan_id);
      if (row.worker_id !== claim.workerId || row.claim_token !== claim.token || row.lease_until !== claim.leaseUntil) throw new SourceExecutionError("SOURCE_EXECUTION_CLAIM_LOST", "Another worker owns this claim.");
      if (row.status !== "claimed") return { started: false as const, plan, job: await this.dto(tx, row) };
      try { await this.claimRow(tx, claim, plan); this.verifyCaseManifest(plan, await this.cases(tx, row.id)); } catch (error) { if (!(error instanceof SourceExecutionError)) throw error; await this.stop(tx, row, error.code, false); return { started: false as const, plan, job: await this.dto(tx, await this.job(tx, row.id)) }; }
      const changed = await tx.query("UPDATE lab_source_execution_jobs_v1 SET status='running' WHERE id=$1 AND status='claimed' AND claim_token=$2", [row.id, claim.token]);
      if (changed.rowCount !== 1) return { started: false as const, plan, job: await this.dto(tx, await this.job(tx, row.id)) };
      await this.emit(tx, row, "running", "The owned executor will receive only the sealed imported closure and controlled Sample capabilities."); return { started: true as const, plan, job: await this.dto(tx, await this.job(tx, row.id)) };
    });
    if (!begun.started) return begun.job;
    const plan = begun.plan;
    for (const item of begun.job.cases.filter(value => value.status === "pending").slice(0, maximumCases)) {
      let bundle: SourceExecutionBundle;
      try {
        bundle = await this.lab.db.transaction(async tx => {
          const row = await this.claimRow(tx, claim, plan), rows = await this.cases(tx, row.id); this.verifyCaseManifest(plan, rows); const current = rows.find(value => value.id === item.id);
          if (!current || current.status !== "pending") throw new SourceExecutionError("SOURCE_EXECUTION_CASE_NOT_PENDING", "This original case cannot be dispatched again.");
          const scenario = sourceScenario(current.scenario_id);
          const binding = { protocol: SOURCE_EXECUTION_PROTOCOL, jobId: row.id, caseId: current.id, executionId: current.execution_id, importId: plan.importId, snapshotId: plan.snapshotId, revisionHash: plan.revisionHash, sourceManifestHash: plan.sourceManifestHash, closureHash: plan.closure.closureHash, planId: plan.id, planHash: plan.planHash, adapterHash: plan.adapterHash, suiteHash: plan.suiteHash, scenarioManifestHash: plan.scenarioManifestHash, scenarioId: current.scenario_id, scenarioHash: scenario.hash, seed: plan.seed, runner: plan.runner };
          const body = { binding, entryPath: plan.entryPath, files: plan.closure.files, edges: plan.closure.edges, deadlineAt: iso(Math.min(this.now() + SOURCE_LIMITS.caseDeadlineMs, Date.parse(plan.expiresAt), Date.parse(claim.leaseUntil))), limits: SOURCE_EXECUTION_PROTOCOL };
          const sealed = verifyBundle({ ...body, bundleHash: objectHash(body) });
          const changed = await tx.query("UPDATE lab_source_execution_cases_v1 SET status='dispatched',dispatched_at=$2,bundle_document=$3,bundle_hash=$4 WHERE id=$1 AND status='pending'", [current.id, iso(this.now()), JSON.stringify(sealed), sealed.bundleHash]);
          if (changed.rowCount !== 1) throw new SourceExecutionError("SOURCE_EXECUTION_CASE_NOT_PENDING", "The original case already has a dispatch record.");
          await this.emit(tx, row, "case_dispatched", "The durable case identity was recorded before isolated execution. Ambiguous acceptance is never redispatched.", current.id); return sealed;
        });
      } catch (error) {
        await this.lab.db.transaction(async tx => { const row = await this.job(tx, claim.jobId); if (!terminal.has(row.status)) await this.stop(tx, row, error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_DISPATCH_UNAVAILABLE", false); }); break;
      }
      const controller = new AbortController(); this.active.set(claim.jobId, controller);
      let checking = false, authorityError: string | null = null;
      const poll = async () => { if (checking || controller.signal.aborted) return; checking = true; try { await this.lab.db.transaction(tx => this.claimRow(tx, claim, plan)); } catch (error) { authorityError = error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_AUTHORITY_UNKNOWN"; controller.abort(new SourceExecutionError(authorityError, "The original authority or claim ended during execution.")); } finally { checking = false; } };
      const interval = setInterval(() => { void poll(); }, SOURCE_LIMITS.authorityPollMs);
      const timeout = setTimeout(() => { authorityError = "SOURCE_EXECUTION_DEADLINE"; controller.abort(new SourceExecutionError(authorityError, "The original execution deadline elapsed.")); }, Math.max(1, Date.parse(bundle.deadlineAt) - this.now()));
      let receipt: SourceExecutionReceipt | null = null, executionError: string | null = null;
      try { receipt = verifySourceReceipt(await executor.execute(structuredClone(bundle), controller.signal), bundle); }
      catch (error) { executionError = error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_OUTCOME_UNKNOWN"; }
      finally { clearInterval(interval); clearTimeout(timeout); this.active.delete(claim.jobId); }
      let stop = false;
      await this.lab.db.transaction(async tx => {
        let row = await this.job(tx, claim.jobId); await tx.query("SELECT id FROM lab_sessions WHERE id=$1 FOR UPDATE", [row.session_id]); row = await this.lockedJob(tx, row.id); const current = (await this.cases(tx, row.id)).find(value => value.id === item.id)!;
        if (this.now() >= Date.parse(bundle.deadlineAt)) authorityError = "SOURCE_EXECUTION_DEADLINE";
        if (receipt) await this.artifact(tx, row, item.id, terminal.has(row.status) ? "late_receipt_withheld" : "executor_receipt", receipt);
        if (terminal.has(row.status) || current.status !== "dispatched" || row.claim_token !== claim.token || row.worker_id !== claim.workerId) { stop = true; return; }
        try { await this.claimRow(tx, claim, plan); }
        catch (error) { authorityError = error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_AUTHORITY_UNKNOWN"; }
        const confirmed = Boolean(receipt && ["confirmed", "not_created"].includes(receipt.disposal.state));
        if (authorityError || controller.signal.aborted || !receipt || !confirmed) {
          const code = authorityError ?? executionError ?? "SOURCE_EXECUTION_CLEANUP_UNKNOWN";
          if (!receipt) await this.artifact(tx, row, item.id, "unknown_outcome", { code, binding: bundle.binding, bundleHash: bundle.bundleHash, observedAt: iso(this.now()), redispatchAllowed: false });
          await tx.query("UPDATE lab_source_execution_cases_v1 SET status=$2,finished_at=$3,receipt_hash=$4,error_code=$5 WHERE id=$1 AND status='dispatched'", [item.id, confirmed && row.cancelled_at ? "cancelled" : "inconclusive", iso(this.now()), receipt?.receiptHash ?? null, code]);
          await this.stop(tx, row, code, !confirmed); stop = true; return;
        }
        await tx.query("UPDATE lab_source_execution_cases_v1 SET status=$2,finished_at=$3,receipt_hash=$4,error_code=$5 WHERE id=$1 AND status='dispatched'", [item.id, receipt.status, iso(this.now()), receipt.receiptHash, receipt.status === "passed" || receipt.status === "failed" ? null : "SOURCE_EXECUTION_" + receipt.status.toUpperCase()]);
        await this.emit(tx, row, "case_" + receipt.status, "The source-bound compiler, unchanged assertions, trace and disposal receipt were retained.", item.id);
        if (!["passed", "failed"].includes(receipt.status)) { await this.stop(tx, row, "SOURCE_EXECUTION_" + receipt.status.toUpperCase(), true); stop = true; }
      });
      if (stop) break;
    }
    return this.lab.db.transaction(async tx => {
      let row = await this.job(tx, claim.jobId);
      if (!terminal.has(row.status)) {
        const cases = await this.cases(tx, row.id);
        if (row.claim_token !== claim.token || row.worker_id !== claim.workerId) return this.dto(tx, row);
        // Only accepted, disposed cases can yield to the next durable step. A
        // dispatched/unknown case is never placed back in the queue.
        if (!row.cancelled_at && cases.some(item => item.status === "pending") && cases.every(item => ["pending", "passed", "failed"].includes(item.status))) {
          try { await this.authorityPlan(tx, { sessionId: row.session_id, grantId: row.grant_id }, plan, true); }
          catch (error) { if (!(error instanceof SourceExecutionError)) throw error; await this.stop(tx, row, error.code, false); return this.dto(tx, await this.job(tx, row.id)); }
          await tx.query("UPDATE lab_source_execution_jobs_v1 SET status='queued',worker_id=NULL,claim_token=NULL,lease_until=NULL WHERE id=$1 AND claim_token=$2 AND status='running'", [row.id, claim.token]);
          await this.emit(tx, row, "case_checkpoint", "The accepted case and confirmed disposal are saved. A later durable step may claim only the original unstarted cases.");
          return this.dto(tx, await this.job(tx, row.id));
        }
        const passed = cases.every(item => item.status === "passed"), failed = cases.some(item => item.status === "failed"), status: SourceJobState = row.cancelled_at ? "cancelled_confirmed" : passed ? "passed" : failed && cases.every(item => ["passed", "failed"].includes(item.status)) ? "failed" : "inconclusive";
        await tx.query("UPDATE lab_source_execution_jobs_v1 SET status=$2,finished_at=$3 WHERE id=$1 AND claim_token=$4", [row.id, status, iso(this.now()), claim.token]); await this.emit(tx, row, "job_" + status, "The bounded job ended. Every completed, failed, cancelled or uncertain case remains separately identified."); row = await this.job(tx, row.id);
      }
      return this.dto(tx, row);
    });
  }
  async runNext(workerId: string, executor: SourceExecutor, options: { jobId?: string; maximumCases?: number } = {}): Promise<SourceJobDTO | null> { const claim = await this.claimNext(workerId, options); return claim ? this.executeClaim(claim, executor, options) : null; }
}
export const sourceExecutionPublicCapabilities = Object.freeze({ scope: "private_owner_only", publicJudgeExecution: false, browserViewGrantExecution: false, sourceIncluded: false });
