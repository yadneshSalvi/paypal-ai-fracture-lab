import { randomUUID } from "node:crypto";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { CampaignBinding, CampaignCaseDTO, CampaignCaseSpec, CampaignCreateInput, CampaignLabDTO, CampaignManifest } from "../../contracts/src/campaign-lab";
import type { EvidenceDTO, RunDTO } from "../../contracts/src/index";
import type { FixtureResource } from "../../service/src/types";
import { projectCatalog } from "../../service/src/catalog";
import { LabError } from "../../service/src/errors";
import { executeRun, newRun } from "../../service/src/executor";
import type { RunInput } from "../../service/src/types";
import { LabStore } from "../../service/src/store";
import { scenarios } from "../../scenarios/src/index";
import { caseResult } from "./analysis";
import { campaignBinding } from "./binding";
import { campaignScenarioIds, recipeForScenario, recipeHash, reductionRecipes } from "./recipes";
import { CampaignStore, campaignTerminal } from "./store";

const terminalRun = new Set(["completed", "inconclusive", "failed_infrastructure", "cancelled_reconciled", "cancelled_uncertain"]);
const safeId = /^[a-zA-Z0-9:_-]{8,100}$/;
const safeSeed = /^[a-zA-Z0-9:_-]{1,100}$/;

export class CampaignLab {
  readonly store: CampaignStore;
  constructor(readonly lab: LabStore, readonly binding: () => Promise<CampaignBinding> = campaignBinding, readonly developerGrantId?: string) { this.store = new CampaignStore(lab); }

  async create(sessionId: string, input: CampaignCreateInput): Promise<CampaignLabDTO> {
    if (input.projectId !== "bramble" || !safeId.test(input.requestId) || !safeSeed.test(input.seed) || !input.scenarioIds.length || input.scenarioIds.length > 6 || new Set(input.scenarioIds).size !== input.scenarioIds.length || input.scenarioIds.some(id => !campaignScenarioIds.includes(id)) || !input.revisions.length || input.revisions.length > 2 || new Set(input.revisions).size !== input.revisions.length || input.revisions.some(revision => !["faulty", "hardened"].includes(revision))) throw new LabError("CAMPAIGN_INPUT_INVALID", "Choose qualified Sample cases, one or both revisions, and a bounded seed.");
    const existing = await this.store.existing(sessionId, input.requestId, input);
    if (existing) return existing;
    const binding = await this.binding();
    const cases: CampaignCaseSpec[] = input.scenarioIds.flatMap(scenarioId => input.revisions.map(revision => {
      const scenario = scenarios.find(item => item.id === scenarioId)!;
      if (!scenario.available || scenario.mode !== "sample" || !scenario.fixtureIds.includes(input.projectId)) throw new LabError("CAMPAIGN_CASE_GATED", "A selected case is not admitted to this Sample suite.", 409);
      const id = randomUUID();
      return { id, ordinal: 0, scenarioId, scenarioTitle: scenario.title, scenarioHash: scenario.hash, revision, sourceHash: binding.revisions.find(item => item.revision === revision)!.sha256, seed: `${input.seed}:${scenarioId}`, runId: randomUUID(), requestId: `campaign-case:${id}`, recipe: null, recipeHash: recipeHash(recipeForScenario(scenarioId)) };
    })).map((item, ordinal) => ({ ...item, ordinal }));
    const manifest: CampaignManifest = { version: "fracture.campaign/v1", kind: input.revisions.length === 2 ? "paired" : "single", projectId: "bramble", seed: input.seed, source: "sample", binding, cases, parent: null };
    return this.store.create(sessionId, input.requestId, input, `${input.revisions.length === 2 ? "Baseline × control" : input.revisions[0] === "faulty" ? "Faulty baseline" : "Hardened control"} · ${input.scenarioIds.length} faults`, manifest, this.developerGrantId);
  }

  async minimize(sessionId: string, campaignId: string, caseId: string, invariantId: string, requestId: string): Promise<CampaignLabDTO> {
    if (!safeId.test(requestId) || !/^I[1-8]$/.test(invariantId)) throw new LabError("REDUCTION_INPUT_INVALID", "Choose an observed failing property and a stable command identity.");
    const input = { kind: "minimization", campaignId, caseId, invariantId, requestId };
    const existing = await this.store.existing(sessionId, requestId, input);
    if (existing) return existing;
    const parent = await this.store.get(campaignId, sessionId);
    const item = parent.cases.find(item => item.id === caseId);
    if (parent.manifest.kind === "minimization" || item?.status !== "completed" || item.revision !== "faulty" || !item.result) throw new LabError("REDUCTION_SOURCE_INVALID", "Choose a completed baseline case from an owned campaign.", 409);
    const property = item.result.checks.find(check => check.id === invariantId && check.verdict === "fail");
    if (!property) throw new LabError("REDUCTION_PROPERTY_NOT_FAILED", "The selected property did not fail in this exact case.", 409);
    const sourceRun = await this.lab.run(item.runId, sessionId);
    if (caseResult(sourceRun).evidenceHash !== item.result.evidenceHash) throw new LabError("REDUCTION_EVIDENCE_CHANGED", "The source run has additional observations. Its original campaign receipt is retained; reduction requires the exact original run evidence.", 409);
    const binding = await this.binding();
    if (binding.runtimeHash !== parent.manifest.binding.runtimeHash) throw new LabError("CAMPAIGN_SOURCE_CHANGED", "The source or runner changed after this campaign. Keep its evidence and create an independent campaign on the current revision.", 409);
    const originalRecipe = recipeForScenario(item.scenarioId);
    const cases: CampaignCaseSpec[] = reductionRecipes(originalRecipe).flatMap(recipe => (["faulty", "hardened"] as const).map(revision => {
      const id = randomUUID(); const digest = recipeHash(recipe);
      return { id, ordinal: 0, scenarioId: item.scenarioId, scenarioTitle: `${item.scenarioId} · ${recipe.components.length} component${recipe.components.length === 1 ? "" : "s"}`, scenarioHash: sha256(canonicalJson({ version: "fracture.reduction-case/v1", parentScenarioHash: item.scenarioHash, recipe })), revision, sourceHash: binding.revisions.find(item => item.revision === revision)!.sha256, seed: item.seed, runId: randomUUID(), requestId: `campaign-case:${id}`, recipe, recipeHash: digest };
    })).map((item, ordinal) => ({ ...item, ordinal }));
    const manifest: CampaignManifest = { version: "fracture.campaign/v1", kind: "minimization", projectId: "bramble", seed: parent.manifest.seed, source: "sample", binding, cases, parent: { campaignId, caseId, runId: item.runId, runEvidenceHash: item.result.evidenceHash, invariantId, invariantVersion: property.version, originalRecipe, originalRecipeHash: recipeHash(originalRecipe) } };
    return this.store.create(sessionId, requestId, input, `Minimal witness · ${property.name}`, manifest, this.developerGrantId);
  }

  async advance(id: string): Promise<{ done: boolean; status: string }> {
    const lease = await this.store.claim(id);
    if (!lease) { const current = await this.store.get(id); return { done: campaignTerminal.has(current.status), status: current.status }; }
    let activeCase: CampaignCaseDTO | null = null;
    try {
      const campaign = await this.store.get(id, lease.sessionId);
      const currentBinding = await this.binding();
      if (sha256(canonicalJson(campaign.manifest)) !== campaign.manifestHash || currentBinding.runtimeHash !== campaign.manifest.binding.runtimeHash) {
        await this.store.release(lease, "needs_attention", "Source, context, or runner bytes changed. No remaining case was dispatched and the original manifest was not replaced.");
        return { done: true, status: "needs_attention" };
      }
      activeCase = campaign.cases.find(item => item.status === "running" || item.status === "pending") ?? null;
      if (!activeCase) { await this.store.release(lease, "completed"); return { done: true, status: "completed" }; }
      const item = activeCase;
      const input: RunInput = { projectId: "bramble", scenarioId: item.scenarioId, revision: item.revision, mode: "sample", seed: item.seed, requestId: item.requestId, interactive: false, campaign: { campaignId: id, caseId: item.id, manifestHash: campaign.manifestHash }, ...(item.recipe ? { executionRecipe: item.recipe } : {}) };
      const previous = await this.lab.db.query<{ document: string; input_hash: string } & Record<string, unknown>>("SELECT document,input_hash FROM lab_runs WHERE id=$1 AND session_id=$2", [item.runId, lease.sessionId]);
      if (previous.rows[0] && previous.rows[0].input_hash !== sha256(canonicalJson(input))) throw new LabError("CAMPAIGN_CASE_CHANGED", "The saved run inputs no longer match the immutable case.", 409);
      let run: RunDTO;
      if (!previous.rows[0]) {
        const project = (await projectCatalog([])).find(project => project.id === "bramble")!;
        const scenario = scenarios.find(scenario => scenario.id === item.scenarioId)!;
        const initial = newRun(input, scenario, project);
        const prepared = { ...initial, id: item.runId, sourceHash: item.sourceHash, scenarioHash: item.scenarioHash, scenarioTitle: item.scenarioTitle, limitations: [...initial.limitations, ...(item.recipe ? ["Executed reduction of a controlled Sample fault recipe. The original named case and its evidence remain unchanged."] : [])] };
        run = (await this.lab.createRun(lease.sessionId, input, prepared)).run;
      } else run = JSON.parse(previous.rows[0].document) as RunDTO;
      if (run.sourceHash !== item.sourceHash || run.scenarioHash !== item.scenarioHash || run.seed !== item.seed || run.source !== "sample") throw new LabError("CAMPAIGN_CASE_CHANGED", "The saved run does not match its source, scenario, seed and Sample mode.", 409);
      if (item.status === "pending") await this.store.beginCase(lease, item);
      if (!terminalRun.has(run.stage)) {
        const jobs = await this.lab.db.query<{ stage: string; lease_until: string | null } & Record<string, unknown>>("SELECT stage,lease_until FROM lab_jobs WHERE id=$1", [`execute:${run.id}`]);
        if (jobs.rows[0]?.stage === "running" && jobs.rows[0].lease_until && jobs.rows[0].lease_until > new Date().toISOString()) {
          await this.store.release(lease, "waiting", "The original case is still owned by its worker. Its dispatch will not be repeated.");
          return { done: false, status: "waiting" };
        }
        try { run = await executeRun(this.lab, run.id, lease.sessionId, lease); }
        catch (error) {
          const saved = await this.lab.run(run.id, lease.sessionId);
          if (!terminalRun.has(saved.stage)) throw error;
          run = saved;
        }
      }
      const changedAfterExecution = (await this.binding()).runtimeHash !== campaign.manifest.binding.runtimeHash;
      const interrupted = changedAfterExecution || run.stage === "failed_infrastructure" || run.stage.startsWith("cancelled_") || run.events.some(event => event.kind === "worker_recovery_uncertain");
      await this.store.settleCase(lease, item, caseResult(run), interrupted);
      if (interrupted) { await this.store.release(lease, "needs_attention", "The original case was interrupted. Inspect its retained evidence; continuing can run only unstarted cases."); return { done: true, status: "needs_attention" }; }
      const remaining = (await this.store.get(id)).cases.some(item => item.status === "pending" || item.status === "running");
      await this.store.release(lease, remaining ? "queued" : "completed");
      return { done: !remaining, status: remaining ? "queued" : "completed" };
    } catch (error) {
      const saved = await this.store.get(id);
      if (campaignTerminal.has(saved.status)) return { done: true, status: saved.status };
      if (error instanceof LabError && ["RUN_ALREADY_ACTIVE", "WORKER_CAPACITY"].includes(error.code)) {
        await this.store.release(lease, "waiting", error.code === "RUN_ALREADY_ACTIVE" ? "Finish or stop the current purchase journey before this campaign continues. No extra case has been executed." : "The experiment workers are occupied. This saved case keeps its original identity.");
        return { done: false, status: "waiting" };
      }
      if (error instanceof LabError && error.code === "CAMPAIGN_LEASE_LOST") return { done: false, status: saved.status };
      await this.store.release(lease, "needs_attention", error instanceof LabError ? `${error.code}: ${error.message}` : "A worker stopped before completing the case. Saved identities and evidence remain available; no uncertain dispatch was replayed.");
      return { done: true, status: "needs_attention" };
    }
  }

  async report(sessionId: string, id: string) {
    const campaign = await this.store.get(id, sessionId);
    const runs: RunDTO[] = [];
    const evidence: EvidenceDTO[] = [];
    const followupModelAttempts: { id: string; runId: string; role: string; status: string }[] = [];
    const resources: { runId: string; observations: FixtureResource[] }[] = [];
    const observationCutoffs: { runId: string; receiptHash: string | null; currentRunHash: string; matchesReceipt: boolean | null }[] = [];
    for (const item of campaign.cases) {
      const rows = await this.lab.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_runs WHERE id=$1 AND session_id=$2", [item.runId, sessionId]);
      if (rows.rows[0]) {
        const run = JSON.parse(rows.rows[0].document) as RunDTO; runs.push(run);
        const records = await this.lab.db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_evidence WHERE run_id=$1 AND session_id=$2 ORDER BY created_at,id", [run.id, sessionId]);
        evidence.push(...records.rows.map(row => JSON.parse(row.document) as EvidenceDTO));
        const models = await this.lab.db.query<{ id: string; role: string; status: string } & Record<string, unknown>>("SELECT id,role,status FROM lab_model_attempts WHERE run_id=$1 AND session_id=$2 ORDER BY id", [run.id, sessionId]);
        followupModelAttempts.push(...models.rows.map(row => ({ id: row.id, runId: run.id, role: row.role, status: row.status })));
        resources.push({ runId: run.id, observations: await this.lab.resources(run.id) });
        const currentRunHash = caseResult(run).evidenceHash;
        observationCutoffs.push({ runId: run.id, receiptHash: item.result?.evidenceHash ?? null, currentRunHash, matchesReceipt: item.result ? currentRunHash === item.result.evidenceHash : null });
      }
    }
    const document = { version: "fracture.campaign-report/v1", exportedAt: new Date().toISOString(), source: "sample", campaignExecution: { paymentProviderCalls: 0, modelCalls: 0 }, followupModelAttempts, campaign, runs, evidence, resources, observationCutoffs, limitations: ["Campaign execution uses controlled local fixtures. It submits no real PayPal payment, real buyer approval or model generation. Independently requested follow-up model attempts are listed separately.", "A shared failed property groups symptoms. Only separately executed reductions support the bounded witness claim.", "Original sealed context-study candidates and original provider experiments are not part of these campaign denominators.", "Cancelled and interrupted cases retain partial observations and are never counted as target passes.", "Case receipts retain their original evidence cutoff. Current owned run observations may include later events; observationCutoffs explicitly reports any difference. Active work can continue after export."], redactions: ["No session tokens, provider credentials, private model reasoning or private planning documents are exported."] };
    return { document, sha256: sha256(canonicalJson(document)) };
  }
}
