import { z } from "zod";
import { LabError, type LabService } from "../../service/src/index";
import { providerFacts, publishedEvidence } from "../../service/src/catalog";
import { scenarios } from "../../scenarios/src/index";
import { DeveloperAccess, type DeveloperCredential } from "./access";

const identity = z.string().min(8).max(120).regex(/^[a-zA-Z0-9:_-]+$/);
const scenario = z.string().min(2).max(8).regex(/^[ASNL][0-9]+$/);
const empty = z.strictObject({});
export const toolDefinitions = {
  get_provider_facts: { description: "Read published provider qualifications, their evidence and limitations. A historical fact is not current buyer authority.", schema: empty, readOnly: true },
  list_experiments: { description: "List curated scenarios and this developer session's persisted Sample runs.", schema: empty, readOnly: true },
  get_run: { description: "Read a run owned by this developer session, including provenance and invariant verdicts.", schema: z.strictObject({ runId: z.uuid() }), readOnly: true },
  propose_scenario: { description: "Return an executable configuration for a qualified curated scenario without running it. No arbitrary code, paths, payees or live payment parameters are accepted.", schema: z.strictObject({ scenarioId: scenario, revision: z.enum(["faulty", "hardened"]) }), readOnly: true },
  run_curated_scenario: { description: "Execute a curated Bramble Sample experiment through the real LabService and pinned SDK local transport. No PayPal funds move. Reuse requestId only with identical parameters.", schema: z.strictObject({ scenarioId: scenario, revision: z.enum(["faulty", "hardened"]), seed: identity, requestId: identity }), readOnly: false },
  diagnose_run: { description: "Ask the configured model to investigate this session's Sample run using scoped read-only evidence tools. This calls the configured AI provider and saves the diagnosis; it cannot repair code or move money.", schema: z.strictObject({ runId: z.uuid(), requestId: identity }), readOnly: false },
  export_report: { description: "Return a JSON report of an owned run and its redacted evidence. The caller chooses where to save the returned text.", schema: z.strictObject({ runId: z.uuid() }), readOnly: true },
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
    if (name === "get_provider_facts") return { facts: providerFacts(await publishedEvidence()), authorization: "Historical qualification only; no live payment authority.", source: "published_evidence" };
    if (name === "list_experiments") return { source: "sample", scenarios, runs: await this.service.store.runs(session.id), limits: { fixture: "bramble", livePayments: false, arbitraryWorkspaceExecution: false, generatedPatchExecution: false } };
    if (name === "get_run") return this.service.store.run(args.runId!, session.id);
    if (name === "export_report") {
      const run = await this.service.store.run(args.runId!, session.id);
      return { schemaVersion: 1, run, evidence: (await this.service.store.evidence(session.id)).filter(item => item.runId === run.id), exportedAt: new Date().toISOString() };
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
