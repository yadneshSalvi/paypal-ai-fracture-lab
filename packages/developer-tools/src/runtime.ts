import { z } from "zod";
import { LabError, type LabService } from "../../service/src/index";
import { providerFacts, publishedEvidence } from "../../service/src/catalog";
import { scenarios } from "../../scenarios/src/index";
import { DeveloperAccess, type DeveloperCredential } from "./access";
import { CampaignLab } from "../../campaigns/src/runtime";
import type { CampaignCreateInput } from "../../contracts/src/campaign-lab";
import type { SourceImportInput, SourceViewApprovalInput } from "../../contracts/src/source-workspaces";
import { SourceAccessStore } from "../../source-access/src/store";
import { sourceApprovalSchema, sourceChangeSchema, sourceFileSchema, sourceIdSchema, sourceImportSchema } from "../../source-access/src/schemas";
import { checkLocalSourceChanges, importLocalSource, sourceRootCapabilities } from "./source-import";
import { SourceExecutionService } from "../../source-execution/src/service";
import { sourcePrepareSchema, sourceApproveSchema, sourceCancelSchema, sourcePlanIdSchema, sourceJobIdSchema, sourceListSchema } from "../../source-execution/src/schemas";
import { sourceRunnerIdentity } from "./source-runner";
import { summarizeSourceExecution } from "./source-results";
import { SourceExecutionViews, sourceExecutionReader, sourceExecutionViewApprovalSchema } from "../../source-execution-view/src/store";

const identity = z.string().min(8).max(120).regex(/^[a-zA-Z0-9:_-]+$/);
const scenario = z.string().min(2).max(8).regex(/^[ASNL][0-9]+$/);
const empty = z.strictObject({});
const campaignIdentity = identity.max(100);
const campaignId = z.uuid();
export const toolDefinitions = {
  prepare_source_execution: { description: "Seal an owned imported TypeScript checkout closure against the unchanged nine public Sample checks and the configured isolated runner. Returns the exact plan/hash for separate approval; no source executes. Unsupported imports are rejected with a retained command receipt.", schema: sourcePrepareSchema, readOnly: false },
  approve_source_execution: { description: "Explicitly approve one exact source, adapter, suite, runner and deadline plan. Saves one durable job; reuse only the identical original request UUID after an unknown acknowledgement. Execution uses controlled Sample capabilities with no network or payment authority.", schema: sourceApproveSchema, readOnly: false },
  get_source_execution_plan: { description: "Read the original owned source-bearing plan and its exact approval hash. Original authority and immutable import are rechecked.", schema: sourcePlanIdSchema, readOnly: true },
  get_source_execution: { description: "Read the original owned execution job and every case state. Unknown dispatched cases are never replayed or treated as passes.", schema: sourceJobIdSchema, readOnly: true },
  list_source_executions: { description: "List original source execution plans and jobs within the current private owner grant.", schema: sourceListSchema, readOnly: true },
  export_source_execution: { description: "Return the original private source-bearing execution report, retained failures, exact receipts and disposal proof. No new case executes.", schema: sourceJobIdSchema, readOnly: true },
  get_source_execution_results: { description: "Read a compact per-case result table for one owned execution: case status, the eight named public assertion verdicts, observed capture/fulfillment/phone values, invariant verdicts with reasons, compiler diagnostics and a bounded ordered event trace. Contains no source text; no new case executes. Use export_source_execution for the complete private report.", schema: sourceJobIdSchema, readOnly: true },
  cancel_source_execution: { description: "Stop pending work under its original job identity. Retain partial failures and withhold late observations; never undo or replay an execution.", schema: sourceCancelSchema, readOnly: false },
  get_source_execution_command: { description: "Recover an original source command acknowledgement by its request UUID. A missing receipt does not authorize redispatch of an unknown VM.", schema: z.strictObject({requestId:z.uuid()}), readOnly: true },
  approve_source_execution_view: { description: "Approve the displayed browser challenge for one exact owned execution receipt. Transfers read-only receipt access until the original authority expires; never grants execution or source text access.", schema: sourceExecutionViewApprovalSchema, readOnly: false },
  list_source_roots: { description: "List explicitly authorized local source root aliases without exposing private absolute paths. Importing source is separate from running it; no application commands or network requests execute.", schema: empty, readOnly: true },
  import_source_workspace: { description: "Import a bounded snapshot from a host-configured root alias and relative path, parse without executing application code, and persist sanitized file contents plus hash-bound metadata in the configured database. Remote database storage needs explicit operator opt-in. Requires the private owner grant. Reuse the same request UUID and body after an unknown response.", schema: sourceImportSchema, readOnly: false },
  list_source_workspaces: { description: "List source snapshots within this owner's original scope. Static risk findings are unverified until separate runtime evidence exists.", schema: empty, readOnly: true },
  get_source_workspace: { description: "Read an owned immutable source snapshot, exact AST spans, declared commands, parser coverage and the latest separately recorded change check. This never executes the imported application.", schema: sourceIdSchema, readOnly: true },
  read_source_file: { description: "Read one exact owned source file from an accepted snapshot using its manifest hash. Reading does not reopen the mutable host repository.", schema: sourceFileSchema, readOnly: true },
  check_source_changes: { description: "Compare the current authorized local source tree with an owned immutable snapshot and retain a separately identified change receipt. The old snapshot stays unchanged. An interrupted observation requires a new explicit request UUID.", schema: sourceChangeSchema, readOnly: false },
  approve_source_view: { description: "Explicitly approve one browser-created connection challenge for read-only access to one exact owned source import. Confirm the displayed browser challenge and selected import. No credential is printed or placed in a URL; execution and payment authority are never transferred. Revoking the owner grant withdraws this view.", schema: sourceApprovalSchema, readOnly: false },
  export_source_snapshot: { description: "Export an owned sanitized source snapshot with exact file bytes, AST findings, hashes and declared static-only limits. The caller chooses where to save the private report.", schema: sourceIdSchema, readOnly: true },
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
    if (["prepare_source_execution","approve_source_execution","get_source_execution_plan","get_source_execution","list_source_executions","export_source_execution","get_source_execution_results","cancel_source_execution","get_source_execution_command","approve_source_execution_view"].includes(name)) {
      const owner={sessionId:session.id,grantId:this.credential.id};
      if(!definition.readOnly&&name!=="cancel_source_execution")await this.service.store.rateLimit(`developer:${this.credential.id}:source-execution`,30);
      if(name==="approve_source_execution_view")return new SourceExecutionViews(this.service.store).approve(owner,parsed.data);
      const retained=["prepare_source_execution","approve_source_execution"].includes(name)?null:await sourceExecutionReader(this.service.store,args.jobId?{jobId:args.jobId}:args.planId?{planId:args.planId}:{owner});
      const execution=retained?.service??new SourceExecutionService(this.service.store,new SourceAccessStore(this.service.store),sourceRunnerIdentity());
      if(name==="prepare_source_execution")return execution.prepare(owner,sourcePrepareSchema.parse(parsed.data));
      if(name==="approve_source_execution")return execution.approve(owner,sourceApproveSchema.parse(parsed.data));
      if(name==="get_source_execution_plan")return execution.getPlan(owner,{planId:args.planId!});
      if(name==="get_source_execution")return execution.getJob(owner,{jobId:args.jobId!});
      if(name==="list_source_executions")return execution.list(owner,sourceListSchema.parse(parsed.data));
      if(name==="export_source_execution")return execution.report(owner,{jobId:args.jobId!});
      if(name==="get_source_execution_results")return summarizeSourceExecution(await execution.report(owner,{jobId:args.jobId!}));
      if(name==="cancel_source_execution")return execution.cancel(owner,sourceCancelSchema.parse(parsed.data));
      return execution.getCommand(owner,args.requestId!);
    }
    if (["list_source_roots", "import_source_workspace", "list_source_workspaces", "get_source_workspace", "read_source_file", "check_source_changes", "approve_source_view", "export_source_snapshot"].includes(name)) {
      const sources = new SourceAccessStore(this.service.store);
      const owner = { sessionId: session.id, grantId: this.credential.id };
      if (name === "list_source_roots") return sourceRootCapabilities();
      if (name === "list_source_workspaces") return sources.list(session.id);
      if (name === "get_source_workspace") return sources.get(session.id, args.importId!);
      if (name === "read_source_file") return sources.readFile(session.id, args.importId!, args.path!, args.expectedHash!);
      if (name === "export_source_snapshot") return sources.report(session.id, args.importId!);
      await this.service.store.rateLimit(`developer:${this.credential.id}:source`, 30);
      if (name === "approve_source_view") return sources.approve(owner, parsed.data as SourceViewApprovalInput);
      if (name === "check_source_changes") return checkLocalSourceChanges(sources, owner, args.importId!, args.requestId!);
      return importLocalSource(sources, owner, parsed.data as SourceImportInput);
    }
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
