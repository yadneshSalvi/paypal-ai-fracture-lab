/** Trusted supervisor, root-owned in a NEW image. Never imports caller-owned modules into this process. */
import fs from "node:fs";
import path from "node:path";
import { fork, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { SqliteDatabase } from "@fracture/paypal-core";
import type { RunDTO, ProjectDTO, ScenarioDTO } from "../../contracts/src/index";
import { LabStore } from "../../service/src/store";
import { initializeDatabase } from "../../service/src/database";
import { newRun, refreshRun } from "../../service/src/executor";
import { noFaults } from "../../service/src/types";
import type { RunInput } from "../../service/src/types";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
import { targetCapabilities } from "../../isolation/src/capabilities";
import { verifyBundle } from "../src/closure";
import { sourceScenario, SCENARIO_MANIFEST_HASH } from "../src/suite";
import { sha256, objectHash, canonical } from "../src/hash";
import { PUBLIC_SUITE_HASH, SOURCE_LIMITS, SOURCE_EXECUTION_PROTOCOL } from "../src/limits";
import { PUBLIC_ASSERTION_IDS } from "../src/receipt";
import { supervisorResultSchema } from "../src/protocol";
import type { SourceSupervisorResult } from "../src/protocol";
import { sourceCapabilityRpc } from "./rpc";
const reference = "/reference";
interface ContextManifest { snapshotHash: string; runnerHash: string; adapterHash: string; dependencyHash: string; suiteHash: string; files: { path: string; sha256: string; bytes: number }[] }
const manifest = JSON.parse(fs.readFileSync(path.join(reference, "source-execution-context.json"), "utf8")) as ContextManifest;
function verifyReference() {
  for (const file of manifest.files) {
    if (path.isAbsolute(file.path) || file.path.split("/").includes("..")) throw new Error("SOURCE_EXECUTION_REFERENCE_PATH");
    const full = path.join(reference, file.path), stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || stat.mode & 0o222 || stat.size !== file.bytes || sha256(fs.readFileSync(full)) !== file.sha256) throw new Error("SOURCE_EXECUTION_REFERENCE_CHANGED");
  }
  if (sha256(fs.readFileSync(path.join(reference, "packages/isolation/runner/suite.ts"))) !== PUBLIC_SUITE_HASH || manifest.suiteHash !== PUBLIC_SUITE_HASH) throw new Error("SOURCE_EXECUTION_SUITE_CHANGED");
}
let input = "";
for await (const chunk of process.stdin) { input += String(chunk); if (Buffer.byteLength(input) > SOURCE_LIMITS.maxBytes * 4 + 128000) throw new Error("SOURCE_EXECUTION_INPUT_LIMIT"); }
const bundle = verifyBundle(JSON.parse(input));
if (bundle.binding.runner.snapshotHash !== manifest.snapshotHash || bundle.binding.runner.runnerHash !== manifest.runnerHash || bundle.binding.adapterHash !== manifest.adapterHash || bundle.binding.runner.dependencyHash !== manifest.dependencyHash || bundle.binding.scenarioManifestHash !== SCENARIO_MANIFEST_HASH) throw new Error("SOURCE_EXECUTION_CONTEXT_CHANGED");
const candidateUid = bundle.binding.runner.engine === "vercel-sandbox" ? 1001 : 1000;
const scenario = sourceScenario(bundle.binding.scenarioId);
if (scenario.hash !== bundle.binding.scenarioHash || Date.parse(bundle.deadlineAt) <= Date.now() || Date.parse(bundle.deadlineAt) > Date.now() + SOURCE_LIMITS.caseDeadlineMs) throw new Error("SOURCE_EXECUTION_CASE_BINDING");
const selfStatus = fs.readFileSync("/proc/self/status", "utf8"), effective = selfStatus.match(/^CapEff:\s*([0-9a-f]+)$/mi)?.[1], nnp = selfStatus.match(/^NoNewPrivs:\s*(\d+)$/m)?.[1];
if (process.getuid?.() !== 0 || effective !== "00000000000000c0" || nnp !== "1") throw new Error("SOURCE_EXECUTION_SUPERVISOR_BOUNDARY");
verifyReference();
const startedAt = new Date().toISOString(), moduleRoot = fs.mkdtempSync("/tmp/fracture-source-modules-"), supervisorRoot = fs.mkdtempSync("/tmp/fracture-source-supervisor-"); fs.chmodSync(moduleRoot, 0o755); fs.chmodSync(supervisorRoot, 0o700);
for (const file of bundle.files) { const full = path.join(moduleRoot, file.path); fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o755 }); fs.writeFileSync(full, file.content, { flag: "wx", mode: 0o444 }); }
fs.symlinkSync("/runtime/node_modules", path.join(moduleRoot, "node_modules"), "dir");
fs.writeFileSync(path.join(moduleRoot, "package.json"), '{"type":"module","private":true}', { flag: "wx", mode: 0o444 });
const check = "__adapter_check_" + randomUUID().replaceAll("-", "") + ".ts";
fs.writeFileSync(path.join(moduleRoot, check), `import type {CheckoutTarget} from '@fracture/source-target';\nimport {checkout} from './${bundle.entryPath}';\nconst target:CheckoutTarget=checkout;void target;\n`, { flag: "wx", mode: 0o444 });
const config = path.join(moduleRoot, "tsconfig.json");
fs.writeFileSync(config, JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", strict: true, exactOptionalPropertyTypes: true, verbatimModuleSyntax: true, esModuleInterop: true, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true, baseUrl: moduleRoot, paths: { "@fracture/source-target": ["/reference/packages/source-execution/src/contract.ts"], "@fracture/contracts": ["/reference/packages/contracts/src/index.ts"] } }, files: [check] }), { flag: "wx", mode: 0o444 });
const verifySource = () => { for (const file of bundle.files) { const stat = fs.lstatSync(path.join(moduleRoot, file.path)); if (!stat.isFile() || stat.uid !== 0 || stat.mode & 0o222 || stat.size !== file.bytes || sha256(fs.readFileSync(path.join(moduleRoot, file.path))) !== file.hash) throw new Error("SOURCE_EXECUTION_IMPORTED_BYTES_CHANGED"); } };
verifySource();
const compilation = spawnSync(process.execPath, ["/runtime/node_modules/typescript/bin/tsc", "--noEmit", "--pretty", "false", "-p", config], { cwd: moduleRoot, uid: candidateUid, gid: candidateUid, env: { NODE_ENV: "production", HOME: "/tmp" }, encoding: "utf8", timeout: Math.min(SOURCE_LIMITS.compilerDeadlineMs, Math.max(1, Date.parse(bundle.deadlineAt) - Date.now())), maxBuffer: 64000 });
const diagnostics = String(compilation.stdout ?? "") + String(compilation.stderr ?? "");
let status: SourceSupervisorResult["status"] = compilation.status === 0 ? "inconclusive" : (compilation.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT" ? "timeout" : (compilation.error as NodeJS.ErrnoException | undefined)?.code === "ENOBUFS" ? "output_limited" : "compiler_rejected";
const compiler: SourceSupervisorResult["compiler"] = { status: compilation.status === 0 ? "passed" : status === "timeout" ? "timeout" : "rejected", version: "typescript@5.9.3", diagnostics: diagnostics.slice(0, 16000), diagnosticsHash: sha256(diagnostics.slice(0, 16000)) };
const targetOutputDigest = createHash("sha256");
let observation: Record<string, unknown> | null = null, assertions: SourceSupervisorResult["assertions"] = [], targetOutput = "", targetOutputBytes = 0, outputFinalized = false, candidate: SourceSupervisorResult["supervisorProof"]["candidate"] = null;
let child: ChildProcess | null = null; let cancellationRequested = false; let activeFailure: ((code: string) => void) | null = null;
process.on("SIGTERM", () => { cancellationRequested = true; activeFailure?.("SOURCE_EXECUTION_CANCELLED"); });
const stopChild = () => { if (child?.pid) spawnSync(process.execPath, ["-e", "process.kill(Number(process.argv[1]),'SIGKILL')", "--", "-" + child.pid], { uid: candidateUid, gid: candidateUid, env: { NODE_ENV: "production" }, timeout: 2000, stdio: "ignore" }); };
if (compiler.status === "passed" && !cancellationRequested) {
  const db = new SqliteDatabase(path.join(supervisorRoot, "case.sqlite")); await initializeDatabase(db); const store = new LabStore(db), session = await store.createSession("owner"), item = scenario.definition;
  const caseScenario: ScenarioDTO = { id: `source-${bundle.binding.caseId}`, title: item.name, shortTitle: item.name, description: "Unchanged public Bramble regression over an explicit imported checkout", family: "Imported source regression", suite: "local", mode: "sample", faultSource: "local_fixture", trigger: "Frozen public case", phase: "checkout", invariantIds: ["I1", "I2", "I3", "I7", "I8"], fixtureIds: ["bramble"], available: true, gate: null, hash: scenario.hash, estimatedSeconds: 5 };
  const project: ProjectDTO = { id: "bramble", name: "Imported Bramble adapter", description: "Caller-owned immutable checkout", language: "TypeScript", kind: "bookshop", sourceHash: bundle.binding.revisionHash, source: "sample", suitePassed: 0, suiteTotal: 0, revisions: [{ id: "faulty", label: "Imported checkout", sourceHash: bundle.binding.revisionHash }], latestRunId: null, map: { nodes: [], edges: [], findings: [], limitations: [] } };
  const runInput: RunInput = { projectId: "bramble", scenarioId: caseScenario.id, revision: "faulty", mode: "sample", seed: sha256(`source-execution-v1:${bundle.binding.seed}:${item.id}`), requestId: bundle.binding.caseId, interactive: false }, run = newRun(runInput, caseScenario, project); await store.createRun(session.id, runInput, run);
  if (item.revoked) await db.query("INSERT INTO lab_faults(run_id,fault_key,document) VALUES($1,'approval-revoked',$2)", [run.id, JSON.stringify({ source: "sample" })]);
  const provider = new LocalPayPalTransport(store, run.id, { ...noFaults, ...item.faults }), context = targetCapabilities(store, run, session.id, provider);
  child = fork("/reference/packages/source-execution/runner/child.ts", [], { cwd: moduleRoot, uid: candidateUid, gid: candidateUid, detached: true, execArgv: ["--import", "/runtime/node_modules/tsx/dist/loader.mjs"], env: { NODE_ENV: "production", HOME: "/tmp", TSX_TSCONFIG_PATH: config }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let failure: string | null = null; const invocations = new Map<string, { resolve: (thrown: boolean) => void; reject: (reason: Error) => void }>();
  let readyResolve!: () => void, readyReject!: (reason: Error) => void; const ready = new Promise<void>((resolve, reject) => { readyResolve = resolve; readyReject = reject; }); ready.catch(() => {});
  const fail = (code: string) => { if (failure) return; failure = code; readyReject(new Error(code)); for (const pending of invocations.values()) pending.reject(new Error(code)); invocations.clear(); stopChild(); };
  activeFailure = fail;
  const rpc = sourceCapabilityRpc(child, context, db, fail, Date.parse(bundle.deadlineAt));
  const onOutput = (chunk: Buffer) => { if(outputFinalized)return; targetOutputDigest.update(chunk); targetOutputBytes += chunk.byteLength; if (targetOutput.length < SOURCE_LIMITS.targetOutputBytes) targetOutput += String(chunk).slice(0, SOURCE_LIMITS.targetOutputBytes - targetOutput.length); fail(targetOutputBytes > SOURCE_LIMITS.targetOutputBytes ? "SOURCE_EXECUTION_TARGET_OUTPUT_LIMIT" : "SOURCE_EXECUTION_TARGET_OUTPUT_PROTOCOL"); };
  child.stdout!.on("data", onOutput); child.stderr!.on("data", onOutput);
  child.on("error", () => fail("SOURCE_EXECUTION_CHILD_ERROR")); child.on("exit", () => { if (!failure && (invocations.size || !candidate)) fail("SOURCE_EXECUTION_CHILD_EXIT"); });
  child.on("message", (message: unknown) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) { fail("SOURCE_EXECUTION_CHILD_PROTOCOL"); return; }
    const value = message as Record<string, unknown>;
    if (value.kind === "rpc") return;
    if (value.kind === "ready" && !candidate && Object.keys(value).sort().join(",") === "capEff,capPrm,gid,kind,noNewPrivs,uid" && value.uid === candidateUid && value.gid === candidateUid && value.capEff === "0000000000000000" && value.capPrm === "0000000000000000" && value.noNewPrivs === true) { candidate = { uid: candidateUid, gid: candidateUid, effectiveCapabilities: "0000000000000000", permittedCapabilities: "0000000000000000", noNewPrivileges: true }; readyResolve(); return; }
    if (value.kind === "invoked" && typeof value.id === "string" && typeof value.thrown === "boolean" && invocations.has(value.id) && Object.keys(value).every(key => ["kind", "id", "thrown", "error"].includes(key))) { invocations.get(value.id)!.resolve(value.thrown); invocations.delete(value.id); return; }
    fail(value.kind === "bootstrap_failed" ? "SOURCE_EXECUTION_IMPORT_FAILED" : "SOURCE_EXECUTION_CHILD_PROTOCOL");
  });
  const timer = setTimeout(() => fail("SOURCE_EXECUTION_CASE_TIMEOUT"), Math.max(1, Date.parse(bundle.deadlineAt) - Date.now() - 3000));
  child.send({ kind: "initialize", candidateUid, entry: path.join(moduleRoot, bundle.entryPath) });
  let thrown = 0;
  try {
    await ready;
    const invoke = (index: number) => new Promise<void>((resolve, reject) => { const id = randomUUID(); invocations.set(id, { resolve: didThrow => { if (didThrow) thrown++; resolve(); }, reject }); child!.send({ kind: "invoke", id, run: item.changedAmount && index > 0 ? { ...run, amountMinor: 1300 } : run, sessionId: session.id }); });
    if (item.concurrent) await Promise.all(Array.from({ length: item.calls }, (_, index) => invoke(index))); else for (let index = 0; index < item.calls; index++) await invoke(index);
    stopChild(); await rpc.close();
    const observed: RunDTO = await refreshRun(store, run.id), resourceReads = observed.events.filter(event => event.kind === "resource_read").length;
    // Exactly the eight unchanged predicates from the hash-bound original nine-case suite.
    const checks = [observed.captureCount === item.expected.captures, observed.fulfillmentCount === item.expected.fulfillments, item.expected.phone === undefined || observed.phoneState === item.expected.phone, observed.capturedMinor <= 1200, !observed.events.some(event => event.kind === "unknown_outcome_presented_failed"), !item.requireIdentity || observed.invariants.find(row => row.id === "I8")?.verdict === "pass", item.revoked || item.changedAmount || thrown === 0, item.id !== "lost" && item.id !== "malformed" || resourceReads > 0];
    assertions = PUBLIC_ASSERTION_IDS.map((id, index) => ({ id, passed: checks[index]! }));
    const evidence = await store.evidence(session.id); const probe = evidence.find(item => item.body.facts && typeof item.body.facts === "object" && Array.isArray((item.body.facts as Record<string,unknown>).results));
    observation = { evidence, rpcAudit: rpc.audit(), capabilityProbeResults: probe ? (probe.body.facts as Record<string,unknown>).results : null, id: item.id, runId: run.id, source: "sample", sourceHash: run.sourceHash, scenarioHash: caseScenario.hash, seed: run.seed, captures: observed.captures, refunds: observed.refunds, events: observed.events, invariants: observed.invariants, captureCount: observed.captureCount, capturedMinor: observed.capturedMinor, fulfillmentCount: observed.fulfillmentCount, phoneState: observed.phoneState, resourceReads, thrown, rpcCalls: rpc.calls() };
    status = checks.every(Boolean) ? "passed" : "failed";
  } catch {
    const reason = failure as string | null; status = reason === "SOURCE_EXECUTION_CANCELLED" ? "cancelled" : reason === "SOURCE_EXECUTION_CASE_TIMEOUT" ? "timeout" : reason?.includes("OUTPUT_LIMIT") ? "output_limited" : "protocol_rejected";
    stopChild(); await rpc.close(); const partial = await refreshRun(store, run.id);
    observation = { evidence: await store.evidence(session.id), rpcAudit: rpc.audit(), reason: reason ?? "SOURCE_EXECUTION_CHILD_PROTOCOL", source: "sample", thrown, rpcCalls: rpc.calls(), incomplete: true, sourceHash: run.sourceHash, scenarioHash: caseScenario.hash, seed: run.seed, captures: partial.captures, refunds: partial.refunds, events: partial.events, invariants: partial.invariants };
  }
  finally { activeFailure = null; clearTimeout(timer); stopChild(); await rpc.close(); if (child.connected) child.disconnect(); await db.close(); }
}
if (cancellationRequested) status = "cancelled";
verifySource(); verifyReference();
outputFinalized = true;
const result = supervisorResultSchema.parse({ protocol: SOURCE_EXECUTION_PROTOCOL, binding: bundle.binding, bundleHash: bundle.bundleHash, status, compiler, assertions, observation, observationHash: objectHash(observation), targetOutputHash: targetOutputDigest.digest("hex"), targetOutputBytes, startedAt, finishedAt: new Date().toISOString(), supervisorProof: { uid: 0, effectiveCapabilities: "00000000000000c0", noNewPrivileges: true, immutableReferenceVerified: true, sourceBeforeAfterVerified: true, candidate } });
process.stdout.write(canonical(result) + "\n");
