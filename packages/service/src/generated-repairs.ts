import { z } from "zod";
import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { SqlConnection } from "@fracture/paypal-core";
import type { EvidenceDTO, RepairDTO, RunDTO } from "@fracture/contracts";
import { generateRepair, loadRepairContext, type GeneratedPatch, type RepairContext, type RepairModel } from "../../ai/src/repair";
import { BackgroundRepairModel, ModelPending, cancelInactiveBackgroundModels } from "../../ai/src/background";
import { runIsolatedCandidate, runnerIdentity, type IsolationResult } from "../../isolation/src/local";
import { cloudRunnerIdentity, runCloudCandidate } from "../../isolation/src/cloud";
import { sourceText } from "./catalog";
import { LabError } from "./errors";
import { LabStore } from "./store";

const jobSchema=z.strictObject({id:z.string().min(8).max(260),sessionId:z.uuid(),runId:z.uuid(),actionId:z.string().min(8).max(120),kind:z.enum(["generate","verify_generated"]),baseHash:z.string().regex(/^[a-f0-9]{64}$/),contextDigest:z.string().regex(/^[a-f0-9]{64}$/),repairId:z.uuid().nullable(),createdAt:z.iso.datetime()});
type RepairJob=z.infer<typeof jobSchema>;
const jobHash=(job:RepairJob)=>sha256(canonicalJson({...job,createdAt:null}));
type JobRow = { id: string; stage: string; lease_owner: string | null; document: string } & Record<string, unknown>;
const codeOf = (error: unknown) => error instanceof LabError ? error.code : "REPAIR_WORKER_FAILURE";

export async function getGeneratedPatch(store: LabStore, sessionId: string, id: string): Promise<GeneratedPatch> {
  const rows = await store.db.query<{ document: string; source_hash: string; context_digest: string } & Record<string, unknown>>("SELECT document,source_hash,context_digest FROM lab_generated_patches WHERE id=$1 AND session_id=$2", [id, sessionId]);
  const row = rows.rows[0]; if (!row) throw new LabError("GENERATED_PATCH_NOT_FOUND", "The candidate is not in this session.", 404);
  const patch = JSON.parse(row.document) as GeneratedPatch;
  const repair = (await store.repairs(sessionId)).find(item => item.id === id);
  if (!repair || patch.repair.id !== id || patch.sourceHash !== row.source_hash || sha256(patch.source) !== row.source_hash || patch.contextDigest !== row.context_digest || sha256(canonicalJson(patch.repair.diff)) !== patch.repair.diffHash || repair.diffHash !== patch.repair.diffHash || repair.baseHash !== patch.repair.baseHash || repair.provenance !== "model_generated") throw new LabError("REPAIR_RECORD_INVALID", "The immutable patch does not match its saved identity.", 409);
  return { ...patch, repair };
}

export async function queueRepairJob(store: LabStore, sessionId: string, run: RunDTO, actionId: string, kind: RepairJob["kind"], repairId?: string) {
  if (process.env.VERCEL === "1") cloudRunnerIdentity();
  if (!(await store.session(sessionId))) throw new LabError("SESSION_EXPIRED", "The session has expired.", 401);
  const context = await loadRepairContext();
  if (run.source !== "sample" || run.projectId !== "bramble" || run.revision !== "faulty" || run.sourceHash !== context.baseHash) throw new LabError("REPAIR_SOURCE_CHANGED", "Select a current faulty Bramble Sample run.", 409);
  if (kind === "verify_generated" || repairId) {
    const patch = await getGeneratedPatch(store, sessionId, repairId ?? "");
    if (patch.repair.runId !== run.id || (kind === "verify_generated" && (patch.repair.status === "rejected" || patch.contextDigest !== context.digest)) || patch.repair.baseHash !== context.baseHash) throw new LabError("REPAIR_NOT_VERIFIABLE", "This exact candidate is rejected or its source/context is stale.", 409);
  }
  await store.rateLimit(`repair:${sessionId}:${kind}`, kind === "generate" ? 6 : 20);
  const job: RepairJob = { id: `repair:${sessionId}:${actionId}`, sessionId, runId: run.id, actionId, kind, baseHash: context.baseHash, contextDigest: context.digest, repairId: repairId ?? null, createdAt: new Date().toISOString() };
  const inputHash = jobHash(job);
  await store.db.query("INSERT INTO lab_repair_jobs(id,session_id,run_id,action_id,kind,stage,created_at,input_hash,document) VALUES($1,$2,$3,$4,$5,'queued',$6,$7,$8) ON CONFLICT(id) DO NOTHING", [job.id, sessionId, run.id, actionId, kind, job.createdAt, inputHash, JSON.stringify(job)]);
  const saved = await store.db.query<{ input_hash: string } & Record<string, unknown>>("SELECT input_hash FROM lab_repair_jobs WHERE id=$1", [job.id]);
  if (saved.rows[0]?.input_hash !== inputHash) throw new LabError("REPAIR_JOB_CONFLICT", "This job identity belongs to another candidate.", 409);
  return job;
}

async function activeJob(store: LabStore, job: RepairJob, owner: string, connection: SqlConnection = store.db) {
  const rows = await connection.query<JobRow>("SELECT * FROM lab_repair_jobs WHERE id=$1", [job.id]);
  const currentRun=await store.record(job.runId,job.sessionId,connection);
  if(currentRun.cancelled)throw new LabError("WORK_CANCELLED","The original experiment is cancelled.",409);
  const actions = await connection.query<{ stage: string } & Record<string, unknown>>("SELECT stage FROM lab_actions WHERE id=$1 AND session_id=$2", [job.actionId, job.sessionId]);
  const sessions = await connection.query<{ expires_at: string; role:string } & Record<string, unknown>>("SELECT expires_at,role FROM lab_sessions WHERE id=$1", [job.sessionId]);
  if(sessions.rows[0]?.role === "owner"){
    const grant=await connection.query("SELECT id FROM lab_developer_grants WHERE session_id=$1 AND revoked_at IS NULL AND expires_at>$2",[job.sessionId,new Date().toISOString()]);
    if(grant.rowCount!==1)throw new LabError("WORK_CANCELLED","The developer grant is no longer active.",409);
  }
  if (rows.rows[0]?.stage !== "running" || rows.rows[0].lease_owner !== owner || String(rows.rows[0].lease_until ?? "") <= new Date().toISOString() || actions.rows[0]?.stage !== "running" || !sessions.rows[0] || Date.parse(sessions.rows[0].expires_at) <= Date.now()) throw new LabError("WORK_CANCELLED", "The repair job no longer has execution authority.", 409);
}
async function commitJob(store: LabStore, job: RepairJob, owner: string, effect: (tx: SqlConnection) => Promise<void>) {
  await store.db.transaction(async tx => {
    await tx.query("SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE", [job.runId, job.sessionId]);
    await tx.query("SELECT id FROM lab_actions WHERE id=$1 AND session_id=$2 FOR UPDATE", [job.actionId, job.sessionId]);
    await tx.query("SELECT id FROM lab_repair_jobs WHERE id=$1 FOR UPDATE", [job.id]);
    await activeJob(store, job, owner, tx); await effect(tx);
    await tx.query("UPDATE lab_repair_jobs SET stage='completed',lease_until=NULL WHERE id=$1 AND lease_owner=$2", [job.id, owner]);
    await tx.query("UPDATE lab_actions SET stage='completed' WHERE id=$1 AND session_id=$2 AND stage='running'", [job.actionId, job.sessionId]);
  });
}
async function currentContext(job: RepairJob, load: () => Promise<RepairContext>) {
  const context = await load();
  if (context.baseHash !== job.baseHash || context.digest !== job.contextDigest) throw new LabError("REPAIR_SOURCE_CHANGED", "Source or grounded context changed after queuing.", 409);
  return context;
}

export interface RepairWorkerOptions {
  jobId?: string;
  cloud?: boolean;
  loadContext?: () => Promise<RepairContext>;
  modelFactory?: (actionId: string) => RepairModel;
  runnerIdentity?: typeof runnerIdentity;
  runCandidate?: (source: string, signal?: AbortSignal) => Promise<IsolationResult>;
}
export async function processRepairJob(store: LabStore, options: RepairWorkerOptions = {}) {
  await cancelInactiveBackgroundModels(store);
  const owner = randomUUID(); const now = new Date().toISOString();
  // Generated model work resumes by its saved provider response; never a fresh POST.
  await store.db.query("UPDATE lab_repair_jobs SET stage='queued',lease_owner=NULL,lease_until=NULL WHERE kind='generate' AND stage='running' AND lease_until<$1 AND EXISTS (SELECT 1 FROM lab_background_models b WHERE b.action_id=lab_repair_jobs.action_id AND b.session_id=lab_repair_jobs.session_id)",[now]);
  // Complete the expired lease update before touching actions: publication locks run → action → job.
  const stale=await store.db.query<{action_id:string;session_id:string}&Record<string,unknown>>("UPDATE lab_repair_jobs SET stage='failed',error_code='REPAIR_WORKER_INTERRUPTED',lease_until=NULL WHERE stage='running' AND lease_until<$1 RETURNING action_id,session_id",[now]);
  for(const row of stale.rows)await store.finishAction(row.action_id,row.session_id,"failed");
  const job = await store.db.transaction(async tx => {
    await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");
    if ((await tx.query("SELECT id FROM lab_repair_jobs WHERE stage='running' AND lease_until>$1", [now])).rowCount >= 1) return null;
    const row = (await tx.query<JobRow>(options.jobId?"SELECT * FROM lab_repair_jobs WHERE stage='queued' AND id=$1 ORDER BY created_at LIMIT 1 FOR UPDATE":"SELECT * FROM lab_repair_jobs WHERE stage='queued' ORDER BY created_at LIMIT 1 FOR UPDATE",options.jobId?[options.jobId]:[])).rows[0]; if (!row) return null;
    await tx.query("UPDATE lab_repair_jobs SET stage='running',lease_owner=$2,lease_until=$3 WHERE id=$1", [row.id, owner, new Date(Date.now() + 360_000).toISOString()]);
    return row;

  });
  if (!job) return null;
  const claimed=job;let decoded:RepairJob;
  try{decoded=jobSchema.parse(JSON.parse(claimed.document));if(decoded.id!==claimed.id||decoded.sessionId!==claimed.session_id||decoded.runId!==claimed.run_id||decoded.actionId!==claimed.action_id||decoded.kind!==claimed.kind||jobHash(decoded)!==claimed.input_hash)throw new Error("identity");}
  catch{await store.db.query("UPDATE lab_repair_jobs SET stage='failed',error_code='REPAIR_JOB_INVALID',lease_until=NULL WHERE id=$1 AND lease_owner=$2",[claimed.id,owner]);await store.finishAction(String(claimed.action_id),String(claimed.session_id),"failed");return {jobId:claimed.id,stage:"failed",errorCode:"REPAIR_JOB_INVALID"};}
  return executeClaimedRepair(store,decoded,owner,options);
}
async function executeClaimedRepair(store:LabStore,job:RepairJob,owner:string,options:RepairWorkerOptions){
  const abort = new AbortController();
  let pulse=false;let auxiliary:string|null=null;let auxiliaryStatus="failed";
  const heartbeat = setInterval(() => { if(pulse)return;pulse=true;void (async () => { await activeJob(store, job, owner); await store.db.query("UPDATE lab_repair_jobs SET lease_until=$3 WHERE id=$1 AND lease_owner=$2 AND stage='running'", [job.id, owner, new Date(Date.now() + 360_000).toISOString()]); })().catch(()=>{abort.abort();}).finally(()=>{pulse=false;}); }, 1000);
  try {
    await activeJob(store, job, owner);
    const load = options.loadContext ?? loadRepairContext; const context = await currentContext(job, load);
    if (job.kind === "generate") {
      const prior=job.repairId?await getGeneratedPatch(store,job.sessionId,job.repairId):null;
      const feedback=prior?{repairId:prior.repair.id,sourceHash:prior.sourceHash,source:prior.source,tests:prior.repair.tests,policyChecks:prior.repair.policyChecks,contextDigest:prior.contextDigest}:undefined;
      const patch = await generateRepair(await store.run(job.runId, job.sessionId), job.sessionId, context, options.modelFactory?.(job.actionId) ?? new BackgroundRepairModel(store, job.actionId, fetch, abort.signal),feedback);
      await currentContext(job, load);
      await commitJob(store, job, owner, async tx => {
        await tx.query("INSERT INTO lab_generated_patches(id,session_id,run_id,source_hash,context_digest,document) VALUES($1,$2,$3,$4,$5,$6)", [patch.repair.id, job.sessionId, job.runId, patch.sourceHash, patch.contextDigest, JSON.stringify(patch)]);
        await tx.query("INSERT INTO lab_repairs(id,session_id,run_id,document) VALUES($1,$2,$3,$4)", [patch.repair.id, job.sessionId, job.runId, JSON.stringify(patch.repair)]);
        const latest = JSON.parse((await store.record(job.runId, job.sessionId, tx)).document) as RunDTO;
        latest.repairIds.push(patch.repair.id); latest.updatedAt = new Date().toISOString();
        await tx.query("UPDATE lab_runs SET document=$2,updated_at=$3,version=version+1 WHERE id=$1", [job.runId, JSON.stringify(latest), latest.updatedAt]);
      });
      return { jobId: job.id, stage: "completed", repairId: patch.repair.id };
    }
    const patch = await getGeneratedPatch(store, job.sessionId, job.repairId!);
    if (patch.sourceHash !== sha256(patch.source) || patch.contextDigest !== context.digest || patch.repair.status === "rejected") throw new LabError("REPAIR_NOT_VERIFIABLE", "The candidate is stale or rejected.", 409);
    const cloud=options.cloud??process.env.VERCEL==="1";
    const identity=cloud?cloudRunnerIdentity():await (options.runnerIdentity??runnerIdentity)();
    auxiliary=`repair-container:${owner}`;
    await store.claimAuxiliaryJob(auxiliary,job.sessionId,job.runId,"repair_verification",{repairId:patch.repair.id,sourceHash:patch.sourceHash});
    const result = await (options.runCandidate ?? (cloud?runCloudCandidate:runIsolatedCandidate))(patch.source, abort.signal);
    const receipt=result.runnerReceipt;
    const boundary=receipt&&receipt.hostMountCount===0&&receipt.credentialEnvironmentForwarded===false&&receipt.snapshotHash===identity.snapshotHash&&(cloud?("snapshotId" in identity&&receipt.kind==="vercel_sandbox"&&receipt.snapshotId===identity.snapshotId&&receipt.networkPolicy==="deny-all"&&receipt.referenceReadOnly===true&&receipt.rootReadOnly===false&&receipt.persistent===false&&receipt.user==="candidate"):("imageId" in identity&&receipt.imageId===identity.imageId&&receipt.networkMode==="none"&&receipt.readOnlyRoot===true&&receipt.user==="1000:1000"));
    if(!boundary)throw new LabError("REPAIR_PROOF_IDENTITY","The result does not bind the isolated runner identity and boundary.",422);
    await currentContext(job, load); await activeJob(store, job, owner);
    const suiteHash = sha256(await sourceText("packages/isolation/runner/suite.ts"));
    const expectedIds = ["compile", "happy", "lost", "malformed", "unavailable", "pending", "auth", "concurrent", "revoked", "payload"];
    const completed = result.stage === "evaluated" && result.candidateHash === patch.sourceHash && result.suiteHash === suiteHash && result.tests.length === expectedIds.length && expectedIds.every(id => result.tests.filter(test => test.id === id).length === 1);
    if (result.stage === "evaluated" && !completed) throw new LabError("REPAIR_PROOF_IDENTITY", "The result does not bind this candidate and unchanged suite.", 422);
    const verified = completed && result.passed && result.policy.every(check=>check.passed) && result.tests.every(test => test.status === "pass");
    const proof: EvidenceDTO = { id: randomUUID(), runId: job.runId, title: "Generated candidate · isolated verification", kind: "test", source: "sample", createdAt: new Date().toISOString(), sha256: sha256(canonicalJson(result)), summary: verified ? "This exact generated source passed compilation and nine unchanged local regressions." : "The independent boundary retained the candidate's failed checks.", body: { repairId: patch.repair.id, candidateHash: patch.sourceHash, contextDigest: patch.contextDigest, result }, redactions: ["No credentials enter the candidate container.", "Sample execution, not live payment or context-study evidence."] };
    const repair: RepairDTO = { ...patch.repair, status: verified ? "verified" : result.stage === "evaluated" ? "compiled" : "rejected", tests: result.tests.map(test => ({ ...test, hidden: false })), policyChecks: [...patch.repair.policyChecks, ...result.policy.map(check => ({ ...check, id: `runner-${check.id}` }))], verificationEvidenceId: proof.id, limitations: [...patch.repair.limitations.filter(line => !line.startsWith("Generated by actual model calls;")), result.stage === "evaluated" ? "The exact generated source was tested against compilation and nine unchanged public regressions. This is not the 600-attempt study or hosted runner qualification." : "The candidate did not reach all nine behavioral regressions; inspect the retained policy or compilation failure. This is not the 600-attempt study or hosted runner qualification."] };
    await commitJob(store, job, owner, async tx => {
      await tx.query("INSERT INTO lab_evidence(id,session_id,run_id,created_at,document) VALUES($1,$2,$3,$4,$5)", [proof.id, job.sessionId, job.runId, proof.createdAt, JSON.stringify(proof)]);
      await tx.query("UPDATE lab_repairs SET document=$3 WHERE id=$1 AND session_id=$2", [repair.id, job.sessionId, JSON.stringify(repair)]);
    });
    auxiliaryStatus="completed";return { jobId: job.id, stage: "completed", repairId: repair.id, verified };
  } catch (error) {
    if(error instanceof ModelPending&&!abort.signal.aborted){
      await store.db.query("UPDATE lab_repair_jobs SET stage='queued',lease_owner=NULL,lease_until=NULL WHERE id=$1 AND lease_owner=$2 AND stage='running'",[job.id,owner]);
      return {jobId:job.id,stage:"waiting"};
    }
    const code = abort.signal.aborted ? "WORK_CANCELLED" : codeOf(error); const stage = code === "WORK_CANCELLED" ? "cancelled" : "failed";
    const changed=await store.db.query("UPDATE lab_repair_jobs SET stage=$3,error_code=$4,lease_until=NULL WHERE id=$1 AND lease_owner=$2 AND stage='running'", [job.id, owner, stage, code]);
    if(changed.rowCount===1)await store.db.query("UPDATE lab_actions SET stage=$3 WHERE id=$1 AND session_id=$2 AND stage='running'", [job.actionId, job.sessionId, stage]);
    return { jobId: job.id, stage, errorCode: code };
  } finally { clearInterval(heartbeat);if(auxiliary)await store.finishAuxiliaryJob(auxiliary,auxiliaryStatus); }
}
