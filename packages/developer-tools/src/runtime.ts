import { z } from "zod";
import { LabError, type LabService } from "../../service/src/index";
import { providerFacts, publishedEvidence } from "../../service/src/catalog";
import { scenarios } from "../../scenarios/src/index";
import { DeveloperAccess, type DeveloperCredential } from "./access";
import { CampaignLab } from "../../campaigns/src/runtime";
import type { CampaignCreateInput } from "../../contracts/src/campaign-lab";

const identity = z.string().min(8).max(120).regex(/^[a-zA-Z0-9:_-]+$/);
const scenario = z.string().min(2).max(8).regex(/^[ASNL][0-9]+$/);
const empty = z.strictObject({});
const campaignIdentity = identity.max(100);
const campaignId = z.uuid();
export const toolDefinitions = {
  get_provider_facts: { description: "Read published provider qualifications, their evidence and limitations. A historical fact is not current buyer authority.", schema: empty, readOnly: true },
  list_experiments: { description: "List curated scenarios and this developer session's persisted Sample runs.", schema: empty, readOnly: true },
  get_run: { description: "Read a run owned by this developer session, including provenance and invariant verdicts.", schema: z.strictObject({ runId: z.uuid() }), readOnly: true },
  propose_scenario: { description: "Return an executable configuration for a qualified curated scenario without running it. No arbitrary code, paths, payees or live payment parameters are accepted.", schema: z.strictObject({ scenarioId: scenario, revision: z.enum(["faulty", "hardened"]) }), readOnly: true },
  run_curated_scenario: { description: "Execute a curated Bramble Sample experiment through the real LabService and pinned SDK local transport. No PayPal funds move. Reuse requestId only with identical parameters.", schema: z.strictObject({ scenarioId: scenario, revision: z.enum(["faulty", "hardened"]), seed: identity, requestId: identity }), readOnly: false },
  diagnose_run: { description: "Ask the configured model to investigate this session's Sample run using scoped read-only evidence tools. This calls the configured AI provider and saves the diagnosis; it cannot repair code or move money.", schema: z.strictObject({ runId: z.uuid(), requestId: identity }), readOnly: false },
  propose_repair: { description: "Queue a new model-generated repair for this session's exact faulty Bramble Sample revision. A local worker reads pinned APIMatic contracts; model output is not verification.", schema: z.strictObject({ runId:z.uuid(), requestId:identity, repairId:z.uuid().optional() }), readOnly:false },
  verify_patch: { description: "Queue independent verification of an immutable generated patch owned by this session. The local worker executes only the saved bounded candidate inside the isolated Docker runner; no caller source or paths are accepted.", schema:z.strictObject({runId:z.uuid(),repairId:z.uuid(),requestId:identity}),readOnly:false },
  export_report: { description: "Return a JSON report of an owned run and its redacted evidence. The caller chooses where to save the returned text.", schema: z.strictObject({ runId: z.uuid() }), readOnly: true },
  list_campaigns: { description: "List this private session's saved Sample campaigns and their exact case counts. Incomplete cases are never target passes.", schema: empty, readOnly: true },
  get_campaign: { description: "Inspect an owned campaign manifest, case receipts, symptom groups and bounded reduction certificate. No case is executed by this read.", schema: z.strictObject({ campaignId }), readOnly: true },
  create_campaign: { description: "Queue a durable Bramble Sample campaign over the exact declared cases, revisions and seed. A qualified local campaign worker executes saved cases. Reuse the same requestId and body after an unknown response. Revoking this developer grant stops pending dispatches.", schema: z.strictObject({ scenarioIds: z.array(z.enum(["S0", "S3", "S4", "S5", "S10", "A4"])).min(1).max(6), revisions: z.array(z.enum(["faulty", "hardened"])).min(1).max(2), seed: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/), requestId: campaignIdentity }), readOnly: false },
  continue_campaign: { description: "Resume remaining unstarted cases of an owned waiting or interrupted campaign under the original source manifest and deadline. Unknown dispatched writes and interrupted cases are never replayed.", schema: z.strictObject({ campaignId, requestId: campaignIdentity }), readOnly: false },
  stop_campaign: { description: "Revoke further dispatches for an owned Sample campaign and retain every partial observation. Stopping does not submit a compensation or erase the original failure.", schema: z.strictObject({ campaignId, requestId: campaignIdentity }), readOnly: false },
  minimize_failure: { description: "Queue all fault-component subsets and matching controls for one observed failing baseline property. The certificate is withheld until the declared search completes. This creates a separate Sample experiment and preserves its exact parent.", schema: z.strictObject({ campaignId, caseId: z.uuid(), invariantId: z.string().regex(/^I[1-8]$/), requestId: campaignIdentity }), readOnly: false },
  export_campaign: { description: "Export an owned campaign's exact manifest, durable receipts, redacted evidence, resource observations and hash. Later run observations are distinguished from original receipt cutoffs.", schema: z.strictObject({ campaignId }), readOnly: true },
} as const;
export type DeveloperToolName = keyof typeof toolDefinitions;

export class DeveloperRuntime {
  readonly access: DeveloperAccess;
  constructor(readonly service: LabService, readonly credential: DeveloperCredential) { this.access = new DeveloperAccess(service); }
  async call(name: string, input: unknown): Promise<unknown> {
    if (!Object.hasOwn(toolDefinitions, name)) throw new LabError("TOOL_NOT_AVAILABLE", "That developer tool is not available.", 404);
    const definition = toolDefinitions[name as DeveloperToolName];
    const parsed = definition.schema.safeParse(input);
    if (!parsed.success) throw new LabError("INVALID_TOOL_INPUT", "Tool arguments do not match the bounded schema; unknown fields are rejected.");
    const session = await this.access.authorize(this.credential);
    await this.service.store.rateLimit(`developer:${this.credential.id}:read`, 120, 60_000);
    const args = parsed.data as Record<string, string>;
    if (["list_campaigns", "get_campaign", "create_campaign", "continue_campaign", "stop_campaign", "minimize_failure", "export_campaign"].includes(name)) {
      const campaigns = new CampaignLab(this.service.store, undefined, this.credential.id);
      if (name === "list_campaigns") return { source: "sample", campaigns: await campaigns.store.list(session.id) };
      if (name === "get_campaign") return campaigns.store.get(args.campaignId!, session.id);
      if (name === "export_campaign") return campaigns.report(session.id, args.campaignId!);
      if (name !== "stop_campaign") await this.service.store.rateLimit(`developer:${this.credential.id}:campaign`, 20);
      const campaign = name === "create_campaign" ? await campaigns.create(session.id, { ...parsed.data, projectId: "bramble" } as CampaignCreateInput)
        : name === "minimize_failure" ? await campaigns.minimize(session.id, args.campaignId!, args.caseId!, args.invariantId!, args.requestId!)
        : await campaigns.store.command(session.id, args.campaignId!, name === "stop_campaign" ? "cancel" : "resume", args.requestId!);
      return { source: "sample", campaign, execution: name === "stop_campaign" ? "stopped" : "durable_queue", worker: "node --import tsx scripts/campaign-worker.ts", authorization: "The original private owner grant and deadline are rechecked before each Sample mutation." };
    }
    if (name === "get_provider_facts") return { facts: providerFacts(await publishedEvidence()), authorization: "Historical qualification only; no live payment authority.", source: "published_evidence" };
    if (name === "list_experiments") return { source: "sample", scenarios, runs: await this.service.store.runs(session.id), limits: { fixture: "bramble", livePayments: false, arbitraryWorkspaceExecution: false, generatedPatchExecution: "saved candidates only; qualified local worker required" } };
    if (name === "get_run") {
      const run=await this.service.store.run(args.runId!,session.id);
      return {...run,repairCandidates:(await this.service.store.repairs(session.id)).filter(item=>item.runId===run.id),repairJobs:(await this.service.store.db.query("SELECT id,kind,stage,created_at,error_code FROM lab_repair_jobs WHERE session_id=$1 AND run_id=$2 ORDER BY created_at",[session.id,run.id])).rows};
    }
    if (name === "export_report") {
      const run = await this.service.store.run(args.runId!, session.id);
      return { schemaVersion: 1, run, repairCandidates:(await this.service.store.repairs(session.id)).filter(item=>item.runId===run.id), evidence: (await this.service.store.evidence(session.id)).filter(item => item.runId === run.id), exportedAt: new Date().toISOString() };
    }
    if(name === "propose_repair" || name === "verify_patch") {
      return this.service.action(session.id,args.runId!,{action:name === "propose_repair"?"generate":"verify_generated",requestId:args.requestId!,...(args.repairId?{repairId:args.repairId}:{})});
    }
    if (name === "diagnose_run") {
      await this.service.store.run(args.runId!, session.id);
      await this.service.store.rateLimit(`developer:${this.credential.id}:diagnosis`, 10);
      return this.service.action(session.id, args.runId!, { action: "diagnose", requestId: args.requestId! });
    }
    const selected = scenarios.find(item => item.id === args.scenarioId);
    if (!selected?.available || selected.mode !== "sample" || !selected.fixtureIds.includes("bramble")) throw new LabError("SCENARIO_GATED", "This scenario is not qualified for curated Sample execution.", 409);
    if (name === "propose_scenario") return { executable: true, source: "sample", scenario: selected, configuration: { projectId: "bramble", scenarioId: selected.id, revision: args.revision, mode: "sample", interactive: false }, explanation: "Supply a stable requestId and seed when invoking run_curated_scenario. This proposal has no side effects." };
    await this.service.store.rateLimit(`developer:${this.credential.id}:run`, 20);
    return this.service.startRun(session.id, { projectId: "bramble", scenarioId: selected.id, revision: args.revision as "faulty" | "hardened", mode: "sample", seed: args.seed!, requestId: args.requestId!, interactive: false });
  }
}

export function safeDeveloperError(error: unknown) {
  return error instanceof LabError ? { code: error.code, message: error.message } : { code: "DEVELOPER_OPERATION_FAILED", message: "The operation failed. No success is implied; inspect retained local evidence before retrying." };
}
