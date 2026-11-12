import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { RunDTO } from "../../contracts/src/index";
import { scenarioFaults } from "../../scenarios/src/index";
import type { LabStore } from "../../service/src/store";
import { LabError } from "../../service/src/errors";
import { CampaignStore } from "./store";
import { recipeFaults } from "./recipes";

async function savedCase(store: LabStore, run: RunDTO, sessionId: string) {
  const rows = await store.db.query<{ campaign_id: string } & Record<string, unknown>>("SELECT campaign_id FROM lab_campaign_cases_v1 WHERE run_id=$1 AND session_id=$2", [run.id, sessionId]);
  if (!rows.rows[0]) return null;
  const campaign = await new CampaignStore(store).get(rows.rows[0].campaign_id, sessionId);
  const item = campaign.cases.find(item => item.runId === run.id);
  const declared = campaign.manifest.cases.find(item => item.runId === run.id);
  const spec = item ? (({ status: _status, result: _result, reason: _reason, ...spec }) => spec)(item) : null;
  if (!item || !declared || sha256(canonicalJson(campaign.manifest)) !== campaign.manifestHash || canonicalJson(spec) !== canonicalJson(declared) || run.sourceHash !== declared.sourceHash || run.scenarioHash !== declared.scenarioHash || run.seed !== declared.seed) throw new LabError("CAMPAIGN_FOLLOWUP_BINDING_CHANGED", "This run no longer matches its saved campaign case. Inspect the original receipt before continuing.", 409);
  return { campaign, item };
}

/** A read-only investigation of a reduced case keeps its actual reduced fault recipe. */
export async function campaignFaultsForRun(store: LabStore, run: RunDTO, sessionId: string) {
  const saved = await savedCase(store, run, sessionId);
  return saved?.item.recipe ? recipeFaults(saved.item.recipe) : scenarioFaults(run.scenarioId);
}

/** Reuse the executed matched control; never replace a reduced recipe with its original named scenario. */
export async function campaignControlForRun(store: LabStore, run: RunDTO, sessionId: string): Promise<RunDTO | null> {
  const saved = await savedCase(store, run, sessionId);
  if (!saved?.item.recipe) return null;
  const control = saved.campaign.cases.find(item => item.revision === "hardened" && item.recipeHash === saved.item.recipeHash && item.seed === saved.item.seed && item.scenarioHash === saved.item.scenarioHash);
  if (saved.item.status !== "completed" || !control?.result || control.status !== "completed") throw new LabError("CAMPAIGN_CONTROL_NOT_READY", "This reduced case needs its completed, exact matched control. Continue or inspect its original campaign; no substitute scenario was run.", 409);
  const recorded = await store.run(control.runId, sessionId);
  if (recorded.sourceHash !== control.sourceHash || recorded.scenarioHash !== control.scenarioHash || recorded.seed !== control.seed || recorded.source !== "sample" || !["completed", "inconclusive"].includes(recorded.stage)) throw new LabError("CAMPAIGN_CONTROL_CHANGED", "The saved control no longer has its original completed execution scope. Its evidence remains available.", 409);
  return recorded;
}
