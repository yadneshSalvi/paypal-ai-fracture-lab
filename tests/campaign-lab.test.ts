import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256, PostgresDatabase, SqliteDatabase, type SqlDatabase } from "@fracture/paypal-core";
import { CampaignLab } from "../packages/campaigns/src/runtime";
import { campaignBinding } from "../packages/campaigns/src/binding";
import { assertCampaignDispatch } from "../packages/campaigns/src/gate";
import { caseResult, reductionCertificate } from "../packages/campaigns/src/analysis";
import type { CampaignLease } from "../packages/campaigns/src/store";
import type { CampaignCaseDTO, CampaignCreateInput, CampaignLabDTO } from "../packages/contracts/src/campaign-lab";
import { initializeDatabase } from "../packages/service/src/database";
import { LabService, LabStore } from "../packages/service/src/index";
import { projectCatalog } from "../packages/service/src/catalog";
import { executeRun, newRun } from "../packages/service/src/executor";
import { scenarios } from "../packages/scenarios/src/index";
import { LocalPayPalTransport } from "../packages/runner/src/local-provider";
import { noFaults, type RunInput } from "../packages/service/src/types";
import { DeveloperAccess } from "../packages/developer-tools/src/access";
import { DeveloperRuntime } from "../packages/developer-tools/src/runtime";

const adapters = process.env.DATABASE_URL ? ["sqlite", "postgres"] as const : ["sqlite"] as const;
async function setup(t: TestContext, adapter: "sqlite" | "postgres") {
  const directory = await mkdtemp(join(tmpdir(), "fracture-campaign-"));
  const filename = join(directory, "campaign.sqlite");
  let db: SqlDatabase; let connectionUrl: string | undefined; let cleanup = async () => {};
  if (adapter === "postgres") {
    const admin = new PostgresDatabase(process.env.DATABASE_URL!);
    const schema = `campaign_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(process.env.DATABASE_URL!); url.searchParams.set("options", `-c search_path=${schema}`); connectionUrl = url.toString();
    db = new PostgresDatabase(connectionUrl);
    cleanup = async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.close(); };
  } else db = new SqliteDatabase(filename);
  await initializeDatabase(db);
  const store = new LabStore(db); const service = new LabService(store); const session = await store.createSession("owner");
  const binding = await campaignBinding();
  const lab = new CampaignLab(store, async () => binding);
  t.after(async () => { await db.close(); await cleanup(); await rm(directory, { recursive: true, force: true }); });
  return { db, store, service, session, lab, binding, fresh: () => adapter === "postgres" ? new PostgresDatabase(connectionUrl!) : new SqliteDatabase(filename) };
}
const input = (scenarioIds = ["S0", "S3"]): CampaignCreateInput => ({ projectId: "bramble", scenarioIds, revisions: ["faulty", "hardened"], seed: "declared-campaign-seed", requestId: randomUUID() });
async function drain(lab: CampaignLab, id: string) {
  for (let step = 0; step < 30; step++) {
    const result = await lab.advance(id);
    if (result.done) return lab.store.get(id);
    assert.notEqual(result.status, "waiting", "The test unexpectedly left a required prior journey active.");
  }
  assert.fail("Campaign did not reach a durable terminal record.");
}
async function prepareCase(lab: CampaignLab, campaign: CampaignLabDTO, lease: CampaignLease, item: CampaignCaseDTO) {
  await lab.store.beginCase(lease, item);
  const args: RunInput = { projectId: "bramble", scenarioId: item.scenarioId, revision: item.revision, mode: "sample", seed: item.seed, requestId: item.requestId, interactive: false, campaign: { campaignId: campaign.id, caseId: item.id, manifestHash: campaign.manifestHash }, ...(item.recipe ? { executionRecipe: item.recipe } : {}) };
  const project = (await projectCatalog([])).find(project => project.id === "bramble")!;
  const scenario = scenarios.find(scenario => scenario.id === item.scenarioId)!;
  const run = { ...newRun(args, scenario, project), id: item.runId, sourceHash: item.sourceHash, scenarioHash: item.scenarioHash, scenarioTitle: item.scenarioTitle };
  return (await lab.lab.createRun(lease.sessionId, args, run)).run;
}
const expired = "2000-01-01T00:00:00.000Z";

for (const adapter of adapters) {
  test(`${adapter}: paired campaigns persist only their exact cases and matched seeds, never surrounding runs`, async t => {
    const { lab, service, store, session, binding } = await setup(t, adapter);
    const surrounding = await service.startRun(session.id, { projectId: "bramble", scenarioId: "A4", revision: "faulty", mode: "sample", seed: "unrelated", requestId: randomUUID(), interactive: false });
    const queued = await lab.create(session.id, input());
    assert.equal(queued.expiresAt, session.expiresAt);
    assert.equal((await store.runs(session.id)).length, 1, "Saving a manifest must not execute a case in the request.");
    const finished = await drain(lab, queued.id);
    assert.equal(finished.status, "completed");
    assert.deepEqual(finished.counts, { planned: 4, completed: 4, interrupted: 0, pending: 0, pass: 1, fail: 2, inconclusive: 1, blocked: 0, notApplicable: 0 });
    assert.ok(finished.cases.every(item => item.runId !== surrounding.id));
    for (const scenarioId of ["S0", "S3"]) {
      const [baseline, control] = finished.cases.filter(item => item.scenarioId === scenarioId);
      assert.equal(baseline!.seed, control!.seed); assert.equal(baseline!.scenarioHash, control!.scenarioHash);
      assert.equal(baseline!.result?.captureCount, 2); assert.equal(control!.result?.captureCount, 1);
      assert.equal(baseline!.sourceHash, binding.revisions.find(item => item.revision === "faulty")!.sha256);
      assert.equal(control!.sourceHash, binding.revisions.find(item => item.revision === "hardened")!.sha256);
      assert.ok(baseline!.result!.witnessEventIds.length > 0);
    }
    assert.ok(finished.clusters.every(group => group.cause === "symptom_group" && !group.runIds.includes(surrounding.id)));
    assert.equal((await store.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
    assert.equal((await store.db.query("SELECT id FROM lab_campaigns")).rowCount, 0, "The legacy campaign denominator must remain separate.");
    const report = await lab.report(session.id, finished.id);
    assert.equal(report.sha256, sha256(canonicalJson(report.document)));
    assert.equal(report.document.runs.length, 4); assert.equal(report.document.campaignExecution.paymentProviderCalls, 0); assert.equal(report.document.campaignExecution.modelCalls, 0);
    assert.deepEqual(report.document.followupModelAttempts, []);
    assert.ok(report.document.evidence.length > 40); assert.ok(report.document.observationCutoffs.every(item => item.matchesReceipt));
    assert.ok(report.document.runs.every(run => run.source === "sample"));
    assert.equal(sha256(canonicalJson(finished.manifest)), queued.manifestHash);
    assert.deepEqual(finished.events.map(event => event.sequence), Array.from({ length: finished.events.length }, (_, index) => index + 1));
  });

  test(`${adapter}: concurrent create and worker retries retain one manifest and one execution per case`, async t => {
    const { lab, store, session, binding } = await setup(t, adapter);
    const args = input(["S0"]);
    const created = await Promise.all(Array.from({ length: 5 }, () => lab.create(session.id, args)));
    assert.equal(new Set(created.map(item => item.id)).size, 1);
    await assert.rejects(lab.create(session.id, { ...args, seed: "changed" }), { code: "CAMPAIGN_PAYLOAD_CONFLICT" });
    await Promise.all(Array.from({ length: 5 }, () => lab.advance(created[0]!.id)));
    const finished = await drain(lab, created[0]!.id);
    const attempts = (await store.db.query("SELECT id FROM lab_target_attempts")).rowCount;
    await Promise.all(Array.from({ length: 5 }, () => lab.advance(finished.id)));
    assert.equal((await store.runs(session.id)).length, 2);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts")).rowCount, attempts);
    const unavailableSource = new CampaignLab(store, async () => { throw new Error("source temporarily unavailable"); });
    assert.equal((await unavailableSource.create(session.id, args)).id, finished.id, "A retry reads the accepted original identity before rebuilding anything.");
    assert.equal(finished.manifest.binding.runtimeHash, binding.runtimeHash);
  });

  test(`${adapter}: owner boundaries cover list, case inspection, cancellation, reduction and export`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const campaign = await drain(lab, (await lab.create(session.id, input(["S0"]))).id);
    const stranger = await store.createSession("owner");
    assert.deepEqual(await lab.store.list(stranger.id), []);
    await assert.rejects(lab.store.get(campaign.id, stranger.id), { code: "CAMPAIGN_NOT_FOUND" });
    await assert.rejects(lab.report(stranger.id, campaign.id), { code: "CAMPAIGN_NOT_FOUND" });
    await assert.rejects(lab.store.command(stranger.id, campaign.id, "cancel", randomUUID()), { code: "CAMPAIGN_NOT_FOUND" });
    await assert.rejects(lab.minimize(stranger.id, campaign.id, campaign.cases[0]!.id, "I2", randomUUID()), { code: "CAMPAIGN_NOT_FOUND" });
    assert.equal((await lab.store.get(campaign.id, session.id)).status, "completed");
  });

  test(`${adapter}: an existing interactive purchase waits for its owner and cannot be auto-retried by a campaign`, async t => {
    const { lab, service, store, session } = await setup(t, adapter);
    const purchase = await service.startRun(session.id, { projectId: "bramble", scenarioId: "S0", revision: "faulty", mode: "sample", seed: "interactive-seed", requestId: randomUUID(), interactive: true });
    const campaign = await lab.create(session.id, input(["S4"]));
    assert.equal((await lab.advance(campaign.id)).status, "waiting");
    assert.equal((await store.run(purchase.id)).captureCount, 1);
    assert.equal((await store.runs(session.id)).length, 1);
    await service.action(session.id, purchase.id, { action: "cancel", requestId: randomUUID() });
    await lab.store.command(session.id, campaign.id, "resume", randomUUID());
    assert.equal((await drain(lab, campaign.id)).counts.completed, 2);
    assert.equal((await store.run(purchase.id)).captureCount, 1);
  });

  test(`${adapter}: cancel retains a committed partial capture, fences a late worker, and releases the session`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0", "S4"]));
    const lease = (await lab.store.claim(campaign.id))!; const item = campaign.cases[0]!;
    await prepareCase(lab, campaign, lease, item);
    const owner = randomUUID(); await store.claimJob(item.runId, owner);
    const scope = { campaignId: campaign.id, caseId: item.id, manifestHash: campaign.manifestHash };
    const transport = new LocalPayPalTransport(store, item.runId, noFaults, owner, tx => assertCampaignDispatch(tx, scope, item.runId, session.id, lease));
    const order = await (await transport.fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", { method: "POST", body: JSON.stringify({ purchase_units: [{ amount: { currency_code: "USD", value: "12.00" } }] }) })).json() as { id: string };
    await transport.approve(order.id);
    await transport.fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${order.id}/capture`, { method: "POST", body: "{}" });
    const resources = canonicalJson(await store.resources(item.runId));
    const commandId = randomUUID();
    const stopped = await lab.store.command(session.id, campaign.id, "cancel", commandId);
    assert.equal(stopped.status, "cancelled"); assert.equal(stopped.counts.interrupted, 1); assert.equal(stopped.counts.blocked, 3); assert.equal(stopped.counts.pass, 0);
    assert.equal(stopped.cases[0]!.result?.capturedMinor, 1200); assert.equal(stopped.cases[0]!.result?.verdict, "inconclusive");
    const refused = await transport.fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", { method: "POST", body: JSON.stringify({ purchase_units: [{ amount: { currency_code: "USD", value: "12.00" } }] }) });
    assert.equal(refused.status, 403); assert.equal(canonicalJson(await store.resources(item.runId)), resources);
    await store.stage(item.runId, "completed", "done");
    assert.equal((await store.run(item.runId)).stage, "cancelled_uncertain", "A late worker cannot resurrect a stopped case.");
    assert.equal((await lab.store.command(session.id, campaign.id, "cancel", commandId)).id, campaign.id);
    await assert.rejects(lab.store.command(session.id, campaign.id, "resume", commandId), { code: "CAMPAIGN_COMMAND_CONFLICT" });
    await assert.rejects(lab.store.command(session.id, campaign.id, "resume", randomUUID()), { code: "CAMPAIGN_NOT_RESUMABLE" });
    const next = await lab.create(session.id, input(["S4"]));
    assert.equal((await drain(lab, next.id)).counts.completed, 2);
    assert.equal(canonicalJson(await store.resources(item.runId)), resources);
  });

  test(`${adapter}: session expiry and stale campaign leases stop dispatch without renewing the original deadline`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0"]));
    const oldLease = (await lab.store.claim(campaign.id))!;
    await prepareCase(lab, campaign, oldLease, campaign.cases[0]!);
    await store.db.query("UPDATE lab_campaign_plans SET lease_until=$2 WHERE id=$1", [campaign.id, expired]);
    const currentLease = (await lab.store.claim(campaign.id))!;
    assert.notEqual(currentLease.owner, oldLease.owner);
    const scope = { campaignId: campaign.id, caseId: campaign.cases[0]!.id, manifestHash: campaign.manifestHash };
    await assert.rejects(store.db.transaction(tx => assertCampaignDispatch(tx, scope, campaign.cases[0]!.runId, session.id, oldLease)), { code: "CAMPAIGN_AUTHORITY_REVOKED" });
    await store.db.query("UPDATE lab_sessions SET expires_at=$2 WHERE id=$1", [session.id, expired]);
    await assert.rejects(store.db.transaction(tx => assertCampaignDispatch(tx, scope, campaign.cases[0]!.runId, session.id, currentLease)), { code: "CAMPAIGN_AUTHORITY_REVOKED" });
    await lab.advance(campaign.id);
    const ended = await lab.store.get(campaign.id);
    assert.equal(ended.status, "expired"); assert.equal(ended.expiresAt, campaign.expiresAt);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts")).rowCount, 0);
    await assert.rejects(lab.store.command(session.id, campaign.id, "resume", randomUUID()), { code: "SESSION_EXPIRED" });
  });

  test(`${adapter}: restart after a finished run imports its original receipt without replaying the case`, async t => {
    const { lab, store, session, binding, fresh } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0"]));
    const lease = (await lab.store.claim(campaign.id))!; const item = campaign.cases[0]!;
    await prepareCase(lab, campaign, lease, item);
    const completed = await executeRun(store, item.runId, session.id, lease);
    const before = canonicalJson(await store.resources(item.runId));
    const attemptCount = (await store.db.query("SELECT id FROM lab_target_attempts WHERE run_id=$1", [item.runId])).rowCount;
    await store.db.query("UPDATE lab_campaign_plans SET lease_until=$2 WHERE id=$1", [campaign.id, expired]);
    const freshDb = fresh();
    try {
      const restored = new CampaignLab(new LabStore(freshDb), async () => binding);
      await restored.advance(campaign.id);
      const observed = await restored.store.get(campaign.id, session.id);
      assert.equal(observed.cases[0]!.result?.evidenceHash, caseResult(completed).evidenceHash);
      assert.equal(observed.cases[0]!.runId, item.runId);
    } finally { await freshDb.close(); }
    assert.equal(canonicalJson(await store.resources(item.runId)), before);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts WHERE run_id=$1", [item.runId])).rowCount, attemptCount);
    assert.equal((await drain(lab, campaign.id)).counts.completed, 2);
  });

  test(`${adapter}: restart at an unknown write preserves uncertainty and resumes only unstarted cases`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0"]));
    const lease = (await lab.store.claim(campaign.id))!; const item = campaign.cases[0]!;
    await prepareCase(lab, campaign, lease, item);
    await store.stage(item.runId, "executing", "first_dispatching");
    await store.db.query("UPDATE lab_jobs SET stage='running',lease_owner='dead-worker',lease_until=$2 WHERE run_id=$1", [item.runId, expired]);
    await store.db.query("UPDATE lab_campaign_plans SET lease_until=$2 WHERE id=$1", [campaign.id, expired]);
    assert.equal((await lab.advance(campaign.id)).status, "needs_attention");
    const interrupted = await lab.store.get(campaign.id, session.id);
    assert.equal(interrupted.cases[0]!.status, "interrupted"); assert.equal(interrupted.counts.pass, 0);
    const original = canonicalJson(await store.run(item.runId));
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts WHERE run_id=$1", [item.runId])).rowCount, 0);
    const requestId = randomUUID(); await lab.store.command(session.id, campaign.id, "resume", requestId); await lab.store.command(session.id, campaign.id, "resume", requestId);
    const completed = await drain(lab, campaign.id);
    assert.equal(completed.counts.completed, 1); assert.equal(completed.counts.interrupted, 1); assert.equal(completed.counts.pass, 1);
    assert.equal(canonicalJson(await store.run(item.runId)), original);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts WHERE run_id=$1", [item.runId])).rowCount, 0);
  });

  test(`${adapter}: a stopped workflow becomes explicit recoverable state without superseding a live worker`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0"]));
    await lab.store.recordWorkflow(campaign.id, 0, "original-workflow");
    const lease = (await lab.store.claim(campaign.id))!;
    await prepareCase(lab, campaign, lease, campaign.cases[0]!);
    assert.equal(await lab.store.continuationStopped(campaign.id, 0, "original-workflow", "failed"), false);
    await store.db.query("UPDATE lab_campaign_plans SET lease_until=$2 WHERE id=$1", [campaign.id, expired]);
    assert.equal(await lab.store.continuationStopped(campaign.id, 0, "original-workflow", "failed"), true);
    const retained = await lab.store.get(campaign.id);
    assert.equal(retained.status, "needs_attention"); assert.equal(retained.cases[0]!.runId, campaign.cases[0]!.runId);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts")).rowCount, 0);
    await lab.store.command(session.id, campaign.id, "resume", randomUUID());
    assert.equal(await lab.store.continuationStopped(campaign.id, 0, "original-workflow", "failed"), false, "An old continuation cannot stop a new dispatch generation.");
    const finished = await drain(lab, campaign.id);
    assert.equal(finished.counts.completed, 2); assert.equal((await store.runs(session.id)).length, 2);
  });

  test(`${adapter}: changed runtime, case document or queued run payload cannot create a passing proof`, async t => {
    const { lab, store, session, binding } = await setup(t, adapter);
    const campaign = await lab.create(session.id, input(["S0"]));
    const changed = new CampaignLab(store, async () => ({ ...binding, runtimeHash: "f".repeat(64) }));
    assert.equal((await changed.advance(campaign.id)).status, "needs_attention");
    assert.equal((await store.runs(session.id)).length, 0);
    await lab.store.command(session.id, campaign.id, "resume", randomUUID());
    const lease = (await lab.store.claim(campaign.id))!; const item = campaign.cases[0]!;
    await prepareCase(lab, campaign, lease, item);
    const document = await store.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_jobs WHERE run_id=$1", [item.runId]);
    const malicious = { ...JSON.parse(document.rows[0]!.document), executionRecipe: { version: "fracture.recipe/v1", components: [] } };
    await store.db.query("UPDATE lab_jobs SET document=$2 WHERE run_id=$1", [item.runId, JSON.stringify(malicious)]);
    await store.db.query("UPDATE lab_campaign_plans SET lease_until=$2 WHERE id=$1", [campaign.id, expired]);
    assert.equal((await lab.advance(campaign.id)).status, "needs_attention");
    assert.equal((await lab.store.get(campaign.id)).cases[0]!.status, "interrupted");
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts")).rowCount, 0);
    await lab.store.command(session.id, campaign.id, "cancel", randomUUID());
    const next = await lab.create(session.id, input(["S0"])); const nextLease = (await lab.store.claim(next.id))!; const nextCase = next.cases[0]!;
    await prepareCase(lab, next, nextLease, nextCase);
    await store.db.query("UPDATE lab_campaign_cases_v1 SET document=$2 WHERE id=$1", [nextCase.id, JSON.stringify({ ...next.manifest.cases[0], seed: "changed" })]);
    await assert.rejects(store.db.transaction(tx => assertCampaignDispatch(tx, { campaignId: next.id, caseId: nextCase.id, manifestHash: next.manifestHash }, nextCase.runId, session.id, nextLease)), { code: "CAMPAIGN_BINDING_CHANGED" });
    assert.equal((await store.db.query("SELECT id FROM lab_provider_resources")).rowCount, 0);
  });

  test(`${adapter}: exhaustive reduction proves the selected property, retains discarded failures, and preserves its parent`, async t => {
    const { lab, store, session } = await setup(t, adapter);
    const parent = await drain(lab, (await lab.create(session.id, input(["S3"]))).id);
    const source = parent.cases[0]!; const originalRun = canonicalJson(await store.run(source.runId));
    const requestId = randomUUID(); const reduction = await lab.minimize(session.id, parent.id, source.id, "I2", requestId);
    assert.equal(reduction.manifest.kind, "minimization"); assert.equal(reduction.cases.length, 16); assert.equal(reduction.reduction?.status, "searching");
    assert.equal(reduction.manifest.parent?.runEvidenceHash, source.result?.evidenceHash);
    const complete = await drain(lab, reduction.id);
    assert.equal(complete.reduction?.status, "verified"); assert.equal(complete.reduction?.minimalComponents, 2); assert.equal(complete.reduction?.exploredSubsets, 8);
    const chosen = complete.cases.find(item => item.id === complete.reduction!.chosenCaseId)!;
    const control = complete.cases.find(item => item.id === complete.reduction!.controlCaseId)!;
    assert.deepEqual([...chosen.recipe!.components].sort(), ["customer_retry", "lost_capture_answer"]);
    assert.equal(control.result?.checks.find(check => check.id === "I2")?.verdict, "pass");
    const discarded = complete.cases.filter(item => complete.reduction!.discardedCaseIds.includes(item.id));
    assert.ok(discarded.some(item => item.result?.verdict === "fail" && item.result.checks.find(check => check.id === "I2")?.verdict === "pass"), "An unrelated identity failure cannot preserve the selected duplicate-capture failure.");
    assert.equal(canonicalJson(await store.run(source.runId)), originalRun);
    assert.equal((await lab.store.get(parent.id)).manifestHash, parent.manifestHash);
    assert.equal((await lab.minimize(session.id, parent.id, source.id, "I2", requestId)).id, complete.id);
    await assert.rejects(lab.minimize(session.id, parent.id, source.id, "I3", randomUUID()), { code: "REDUCTION_PROPERTY_NOT_FAILED" });
    const missingControl = complete.cases.map(item => item.id === control.id ? { ...item, status: "interrupted" as const } : item);
    assert.equal(reductionCertificate(complete.manifest, missingControl)?.status, "inconclusive");
    assert.ok(!reductionCertificate(complete.manifest, missingControl)?.scope.includes("Every subset was executed"));
    const lastControlPending = complete.cases.map((item, index) => index === complete.cases.length - 1 ? { ...item, status: "pending" as const, result: null } : item);
    assert.equal(reductionCertificate(complete.manifest, lastControlPending)?.status, "searching", "Even a different unfinished control withholds the certificate.");
    await store.emit(source.runId, { lane: "lab", kind: "additional_observation", title: "Later observation", detail: "A later observation must not be silently merged into the original reduction receipt." });
    assert.equal((await lab.minimize(session.id, parent.id, source.id, "I2", requestId)).id, complete.id, "A retry recovers the accepted original reduction even after later observations.");
    await assert.rejects(lab.minimize(session.id, parent.id, source.id, "I2", randomUUID()), { code: "REDUCTION_EVIDENCE_CHANGED" });
    const laterReport = await lab.report(session.id, parent.id);
    assert.equal(laterReport.document.observationCutoffs.find(item => item.runId === source.runId)?.matchesReceipt, false);
    assert.equal(laterReport.document.campaign.cases[0]!.result?.evidenceHash, source.result!.evidenceHash);
  });

  test(`${adapter}: reduced-case diagnosis and verification keep the executed subset and original matched control`, async t => {
    const { lab, service, store, session } = await setup(t, adapter);
    const parent = await drain(lab, (await lab.create(session.id, input(["S3"]))).id);
    const reduction = await drain(lab, (await lab.minimize(session.id, parent.id, parent.cases[0]!.id, "I2", randomUUID())).id);
    const chosen = reduction.cases.find(item => item.id === reduction.reduction!.chosenCaseId)!;
    const control = reduction.cases.find(item => item.id === reduction.reduction!.controlCaseId)!;
    assert.ok(!chosen.recipe!.components.includes("unavailable_reread"));
    const diagnosis = await service.diagnose(session.id, chosen.runId);
    assert.equal(diagnosis.experiment.observedStatus, "COMPLETED", "The omitted reread fault must stay omitted in the follow-up investigation.");
    const count = (await store.runs(session.id)).length;
    await service.action(session.id, chosen.runId, { action: "repair", candidate: "grounded", requestId: randomUUID() });
    const verified = await service.action(session.id, chosen.runId, { action: "verify", requestId: randomUUID() });
    assert.equal(verified.comparisonRunId, control.runId);
    assert.equal((await store.runs(session.id)).length, count, "Verification must reuse the existing exact control instead of rerunning the original full S3 recipe.");
    assert.equal((await store.run(control.runId)).scenarioHash, chosen.scenarioHash);
    assert.equal((await lab.store.get(reduction.id)).cases.find(item => item.id === chosen.id)!.result!.evidenceHash, chosen.result!.evidenceHash);
    assert.equal((await store.db.query("SELECT id FROM lab_model_attempts")).rowCount, 0);
  });

  test(`${adapter}: private developer campaigns bind the original grant and stop queued work after revocation`, async t => {
    const { lab, store, service } = await setup(t, adapter);
    const access = new DeveloperAccess(service); await access.initialize();
    const { credential, session } = await access.create();
    const runtime = new DeveloperRuntime(service, credential);
    const { projectId: _project, ...args } = input(["S0"]);
    await assert.rejects(runtime.call("create_campaign", { ...args, mode: "live_sandbox" }), { code: "INVALID_TOOL_INPUT" });
    const accepted = await runtime.call("create_campaign", args) as { campaign: CampaignLabDTO; execution: string };
    assert.equal(accepted.execution, "durable_queue"); assert.equal(accepted.campaign.manifest.authorization?.grantIdHash, sha256(credential.id));
    assert.equal(accepted.campaign.expiresAt, session.expiresAt);
    assert.ok(!JSON.stringify(accepted).includes(credential.secret)); assert.ok(!JSON.stringify(accepted).includes(credential.id));
    assert.equal((await runtime.call("create_campaign", args) as { campaign: CampaignLabDTO }).campaign.id, accepted.campaign.id);
    const stranger = new DeveloperRuntime(service, (await access.create()).credential);
    await assert.rejects(stranger.call("get_campaign", { campaignId: accepted.campaign.id }), { code: "CAMPAIGN_NOT_FOUND" });
    await assert.rejects(stranger.call("export_campaign", { campaignId: accepted.campaign.id }), { code: "CAMPAIGN_NOT_FOUND" });
    await lab.advance(accepted.campaign.id);
    const first = await lab.store.get(accepted.campaign.id); assert.equal(first.counts.completed, 1);
    const attempts = (await store.db.query("SELECT id FROM lab_target_attempts")).rowCount;
    await access.revoke(credential);
    assert.equal((await lab.advance(accepted.campaign.id)).status, "cancelled");
    const ended = await lab.store.get(accepted.campaign.id);
    assert.equal(ended.counts.completed, 1); assert.equal(ended.counts.blocked, 1); assert.equal(ended.expiresAt, accepted.campaign.expiresAt);
    assert.equal((await store.db.query("SELECT id FROM lab_target_attempts")).rowCount, attempts);
    await assert.rejects(runtime.call("get_campaign", { campaignId: ended.id }), { code: "DEVELOPER_ACCESS_DENIED" });
    await assert.rejects(lab.store.command(session.id, ended.id, "resume", randomUUID()), { code: "CAMPAIGN_AUTHORITY_REVOKED" });
  });

  test(`${adapter}: a developer grant revoked during a case is fenced at the actual mutation boundary`, async t => {
    const { store, service, binding } = await setup(t, adapter);
    const access = new DeveloperAccess(service); await access.initialize();
    const { credential, session } = await access.create();
    const campaigns = new CampaignLab(store, async () => binding, credential.id);
    const campaign = await campaigns.create(session.id, input(["S0"]));
    const lease = (await campaigns.store.claim(campaign.id))!; const item = campaign.cases[0]!;
    await prepareCase(campaigns, campaign, lease, item);
    await access.revoke(credential);
    const scope = { campaignId: campaign.id, caseId: item.id, manifestHash: campaign.manifestHash };
    await assert.rejects(store.db.transaction(tx => assertCampaignDispatch(tx, scope, item.runId, session.id, lease)), { code: "CAMPAIGN_AUTHORITY_REVOKED" });
    assert.equal((await campaigns.advance(campaign.id)).status, "cancelled");
    assert.equal((await store.db.query("SELECT id FROM lab_provider_resources")).rowCount, 0);
  });
}
