import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, open, readdir, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse } from "dotenv";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import { getDatabase } from "../packages/service/src/database";
import { workspaceRoot } from "../packages/service/src/config";
import { LabStore, LabService, LabError } from "../packages/service/src/index";
import { sessionCookie, sessionCookieName } from "../packages/service/src/auth";
import { queueRepairJob, processRepairJob } from "../packages/service/src/generated-repairs";
import { loadRepairContext } from "../packages/ai/src/repair";
import { modelDiagnosis } from "../packages/ai/src/diagnosis";
import { OpenAIModel, strictObject } from "../packages/ai/src/model";
import { BackgroundRepairModel, ModelPending } from "../packages/ai/src/background";
import { GeminiInteractionModel } from "../packages/ai/src/gemini";
import { modelToolkitReview } from "../packages/ai/src/toolkit-review";
import { createModelTransport, modelTransportLimits } from "../packages/ai/src/transport";
import { journaledProviderFetch } from "./runtime-qualification-journal";

const protocolName = "fracture-runtime-transport-2026-11-v2";
const root = resolve(workspaceRoot());
const directory = join(root, ".artifacts/runtime-qualification", protocolName);
const cases = ["astra-diagnosis", "astra-repair", "sol-background", "gemini-toolkit"] as const;
type CaseName = typeof cases[number];
interface Protocol {
  schemaVersion: 1; name: string; frozenAt: string; source: { commit: string; files: { path: string; sha256: string }[] };
  sessionId: string; runId: string; expiresAt: string; seed: string; originalResourceHash: string;
  contextDigest: string; baseHash: string; actions: Record<CaseName, string>;
  scope: Record<string, unknown>; configuration: Record<string, unknown>;
}
async function writeNew(path: string, value: unknown) {
  const file = await open(path, "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2) + "\n"); await file.sync(); } finally { await file.close(); }
}
async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, "utf8")) as T; }
async function sourceManifest() {
  const tracked = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const added = execFileSync("git", ["-C", root, "ls-files", "--others", "--exclude-standard", "-z", "--", "packages/ai", "scripts", "tests", "apps/web"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const paths = [...new Set([...tracked, ...added])].sort();
  const files = [];
  for (const path of paths) {
    if (!(await lstat(join(root, path))).isFile()) throw new Error("A source manifest entry is not an ordinary file.");
    files.push({ path, sha256: createHash("sha256").update(await readFile(join(root, path))).digest("hex") });
  }
  return { commit: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(), files };
}
async function validateSource(protocol: Protocol) {
  if (canonicalJson(await sourceManifest()) !== canonicalJson(protocol.source)) throw new Error("Frozen qualification source changed. Retain the original result and declare a separate protocol before new dispatch.");
  const context = await loadRepairContext();
  if (context.digest !== protocol.contextDigest || context.baseHash !== protocol.baseHash) throw new Error("The frozen authoring context changed.");
}
function validateDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (url.hostname !== "127.0.0.1" || url.port !== "55569" || url.username !== "fracture_runtime_stage7" || url.pathname !== "/fracture_runtime_stage7") throw new Error("Qualification is restricted to the separately allocated stage7 database and role.");
  if (process.env.APP_URL !== "http://localhost:4598") throw new Error("The declared local qualification origin changed.");
}
async function credentials() {
  const index = process.argv.indexOf("--provider-env");
  if (index < 0 || !process.argv[index + 1]) throw new Error("Use the explicitly authorized private provider environment path.");
  const values = parse(await readFile(resolve(process.argv[index + 1]!), "utf8"));
  if (!values.OPENAI_API_KEY || !values.GEMINI_API_KEY || values.OPENAI_PLANNER_MODEL !== "gpt-6-astra" || values.OPENAI_MODEL !== "gpt-6.1-sol" || values.GEMINI_MODEL !== "gemini-3.8-flash") throw new Error("The authorized provider keys/model identities do not match this declared protocol.");
  process.env.OPENAI_API_KEY = values.OPENAI_API_KEY; process.env.GEMINI_API_KEY = values.GEMINI_API_KEY;
  process.env.OPENAI_PLANNER_MODEL = "gpt-6-astra"; process.env.OPENAI_MODEL = "gpt-6.1-sol"; process.env.OPENAI_REASONING_EFFORT = "max"; process.env.GEMINI_MODEL = "gemini-3.8-flash";
}
async function main() {
  validateDatabase();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const db = await getDatabase();
  const store = new LabStore(db);
  const service = new LabService(store);
  try {
    const identity = (await db.query<{ database: string; actor: string } & Record<string, unknown>>("SELECT current_database() AS database,current_user AS actor")).rows[0];
    if (identity?.database !== "fracture_runtime_stage7" || identity.actor !== "fracture_runtime_stage7") throw new Error("Unexpected database identity.");
    if (process.argv.includes("--prepare")) {
      await writeNew(join(directory, "preparation-intent.json"), { protocolName, startedAt: new Date().toISOString(), database: identity, providerDispatchAuthorizedByThisStep: false });
      if ((await db.query("SELECT id FROM lab_sessions")).rowCount) throw new Error("The qualification database already has a session. Do not create a replacement.");
      const session = await store.createSession("judge");
      await writeNew(join(directory, "session-created.json"), session);
      const seed = "fracture:runtime:transport:v2:original-purchase:01";
      const run = await service.startRun(session.id, { projectId: "bramble", scenarioId: "S0", revision: "faulty", mode: "sample", seed, requestId: `${protocolName}:original-purchase`, interactive: false });
      await writeNew(join(directory, "original-run-created.json"), { runId: run.id, source: run.source, seed, verdict: run.verdict, captureCount: run.captureCount, orderIds: run.orderIds, sourceHash: run.sourceHash });
      await db.query("UPDATE lab_sessions SET seeded=1,selected_run_id=$2 WHERE id=$1", [session.id, run.id]);
      const context = await loadRepairContext();
      const protocol: Protocol = {
        schemaVersion: 1, name: protocolName, frozenAt: new Date().toISOString(), source: await sourceManifest(),
        sessionId: session.id, runId: run.id, expiresAt: session.expiresAt, seed,
        originalResourceHash: sha256(canonicalJson(await store.resources(run.id))), contextDigest: context.digest, baseHash: context.baseHash,
        actions: Object.fromEntries(cases.map(name => [name, randomUUID()])) as Record<CaseName, string>,
        scope: { kind: "product_runtime_qualification", comparisonStudy: false, originalSealedStudy: "unchanged; no rerun, replacement, reclassification or treatment/outcome claims", cases, newSamplePurchases: 1, actualFinancialProviderRequests: 0, providerMoneyMutations: 0, automaticModelCreateRetries: 0, unknownDispatchPolicy: "retain intent, response prefix and native causes; never automatically create a replacement", candidateExecution: "not dispatched while the Docker daemon is unavailable; exact generated candidate remains unverified", toolkit: "actual installed @paypal/agent-toolkit 1.11.0 get_order with explicit run-owned Sample wire alias", sdk: "actual pinned paypal 2.29.0 PaypalClient.orders.getOrder on controlled Sample transport" },
        configuration: { node: process.version, bundledUndici: process.versions.undici, transport: modelTransportLimits, openai: { planner: "gpt-6-astra", execution: "gpt-6.1-sol", reasoning: "max", diagnosis: { stream: true, store: false, perCallDeadlineMs: 90000, maximumOutputTokens: 6144 }, repair: { stream: true, store: false, perCallDeadlineMs: 900000, planMaximumOutputTokens: 30000, sourceMaximumOutputTokens: 128000 }, background: { store: false, background: true, perHttpDeadlineMs: 30000, originalResponsePollingOnly: true } }, gemini: { model: "gemini-3.8-flash", thinkingLevel: "high", store: true, apiRevision: "2026-05-20", maximumOutputTokens: 32768, perCallDeadlineMs: 900000 }, journal: "fsync request intent before dispatch; exact private response bytes and chunk boundaries before parser consumption; no credentials in journal headers", opaqueContext: "AES-256-GCM server vault for full raw responses; only allowlisted public outputs in evidence" },
      };
      await writeNew(join(directory, "protocol.json"), protocol);
      await writeNew(join(directory, "private-browser-packet.json"), { origin: "http://localhost:4598", route: `/runs/${run.id}`, cookieName: sessionCookieName, cookieFormat: "value", cookieValue: sessionCookie(session, false).split(";")[0]!.slice(sessionCookieName.length + 1), expiresAt: session.expiresAt, sessionId: session.id, runId: run.id, review: "Existing-actor read-only inspection. No new admissions, exports, model actions, candidate verification or resource writes." });
      console.log(JSON.stringify({ prepared: true, protocolName, runId: run.id, sessionId: session.id, sourceFiles: protocol.source.files.length, providerRequests: 0, frozenAt: protocol.frozenAt }));
      return;
    }
    const protocol = await readJson<Protocol>(join(directory, "protocol.json"));
    await validateSource(protocol);
    if (protocol.name !== protocolName || !(await store.session(protocol.sessionId))) throw new Error("The original qualification session or protocol is unavailable. Do not extend or replace it.");
    const chosen = process.argv.find(arg => arg.startsWith("--execute="))?.slice(10) ?? process.argv.find(arg => arg.startsWith("--resume="))?.slice(9);
    if (!chosen || !cases.includes(chosen as CaseName)) throw new Error("Choose one declared --execute case or the retained --resume=sol-background.");
    const name = chosen as CaseName;
    const resume = process.argv.includes(`--resume=${name}`);
    const caseDir = join(directory, name);
    await mkdir(caseDir, { recursive: true, mode: 0o700 });
    if (!resume) await writeNew(join(caseDir, "intent.json"), { protocolSha256: sha256(canonicalJson(protocol)), case: name, actionId: protocol.actions[name], runId: protocol.runId, startedAt: new Date().toISOString(), newMutationRetry: false });
    else {
      if (name !== "sol-background") throw new Error("Only the original background response supports this read-only resume.");
      const checkpoint = (await db.query<{ document: string } & Record<string, unknown>>("SELECT document FROM lab_background_models WHERE action_id=$1 AND session_id=$2", [protocol.actions[name], protocol.sessionId])).rows[0];
      const saved = checkpoint ? JSON.parse(checkpoint.document) as { stage: string; responseId?: string } : null;
      if (!saved?.responseId || saved.stage !== "polling") throw new Error("No retained provider response is available for a safe poll. Do not create another request.");
      await writeNew(join(caseDir, `resume-${randomUUID()}.json`), { at: new Date().toISOString(), responseId: saved.responseId, method: "GET", originalActionId: protocol.actions[name] });
    }
    const actionId = protocol.actions[name];
    if (!resume) {
      const claim = await store.claimAction(protocol.sessionId, protocol.runId, actionId, name === "astra-diagnosis" ? "diagnose" : name === "astra-repair" ? "generate" : name === "gemini-toolkit" ? "toolkit_review" : "runtime_recovery", { protocolName, case: name });
      if (claim !== "claimed") throw new Error("The original case already owns an application action; inspect its retained state.");
    }
    await credentials();
    const transport = createModelTransport({ fetchImpl: journaledProviderFetch({ directory: join(caseDir, "provider"), namespace: "requests" }) });
    let result: unknown;
    let stage = "completed";
    let errorCode: string | null = null;
    try {
      const run = await store.run(protocol.runId, protocol.sessionId);
      if (name === "astra-diagnosis") result = await modelDiagnosis(store, protocol.sessionId, run, new OpenAIModel(store, transport, actionId));
      if (name === "astra-repair") {
        const job = await queueRepairJob(store, protocol.sessionId, run, actionId, "generate");
        result = await processRepairJob(store, { jobId: job.id, modelFactory: id => new OpenAIModel(store, transport, id) });
        if (!result || (result as { stage: string }).stage !== "completed") { stage = "failed"; errorCode = (result as { errorCode?: string } | null)?.errorCode ?? "REPAIR_NOT_COMPLETED"; }
      }
      if (name === "sol-background") result = await new BackgroundRepairModel(store, actionId, transport).call(protocol.sessionId, run.id, { role: "runtime_background_recovery", model: "gpt-6.1-sol", maximumOutputTokens: 16384, instructions: "Review these retained Sample observations. Return concise public conclusions and uncertainty only, never private reasoning. A missing response is not evidence that no capture occurred. No tool or payment action is available. This checks one original background response across workers, not repair efficacy or a model comparison.", input: { source: run.source, captureCount: run.captureCount, capturedMinor: run.capturedMinor, currency: run.currency, observedEvents: run.events.map(event => ({ kind: event.kind, projection: event.projection })) }, schema: strictObject({ conclusion: { type: "string" }, uncertainty: { type: "array", items: { type: "string" } } }) });
      if (name === "gemini-toolkit") result = await modelToolkitReview(store, protocol.sessionId, run, new GeminiInteractionModel(store, actionId, transport));
    } catch (error) {
      if (error instanceof ModelPending) { stage = "waiting"; result = { originalResponseRetained: true, nextStep: "Fresh-process --resume=sol-background performs a GET on the original response only." }; }
      else { stage = "failed"; errorCode = error instanceof LabError ? error.code : "QUALIFICATION_RUNTIME_FAILURE"; result = { errorCode }; }
    }
    if (stage !== "waiting") await store.finishAction(actionId, protocol.sessionId, stage);
    const resourcesUnchanged = protocol.originalResourceHash === sha256(canonicalJson(await store.resources(protocol.runId)));
    const attempts = await db.query<{ id: string; role: string; status: string; document: string } & Record<string, unknown>>("SELECT id,role,status,document FROM lab_model_attempts WHERE session_id=$1 ORDER BY role,id", [protocol.sessionId]);
    const report = { protocolName, case: name, actionId, stage, errorCode, finishedAt: new Date().toISOString(), resourcesUnchanged, result, attempts: attempts.rows.map(row => ({ id: row.id, role: row.role, status: row.status, record: JSON.parse(row.document) as unknown })) };
    await writeNew(join(caseDir, `${stage}-${randomUUID()}.json`), report);
    if (!resourcesUnchanged) throw new Error("The original Sample financial resources changed during read/model qualification.");
    console.log(JSON.stringify({ protocolName, case: name, stage, errorCode, resourcesUnchanged, modelAttempts: attempts.rowCount }));
  } finally { delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY; await db.close(); }
}
await main();
