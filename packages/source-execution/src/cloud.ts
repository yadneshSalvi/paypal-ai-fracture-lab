import { createHash } from "node:crypto";
import { Readable, Writable } from "node:stream";
import { Sandbox } from "@vercel/sandbox";
import { cloudRunnerIdentitySchema, sourceReceiptSchema } from "./schemas";
import type { SourceExecutionBundle, SourceExecutionReceipt, SourceExecutor, SourceRunnerIdentity } from "./schemas";
import { verifyBundle } from "./closure";
import { verifySourceReceipt } from "./receipt";
import { supervisorResultSchema } from "./protocol";
import { canonical, objectHash, sha256 } from "./hash";
import { PUBLIC_SUITE_HASH, SOURCE_EXECUTION_PROTOCOL, SOURCE_LIMITS } from "./limits";
import { SourceExecutionError } from "./errors";

type CloudIdentity = Extract<SourceRunnerIdentity, { engine: "vercel-sandbox" }>;
export interface SourceCloudCredentials { token: string; teamId: string; projectId: string }
export interface SourceCloudConfiguration {
  identity: CloudIdentity;
  snapshotExpiresAt: string;
  /** Trusted SDK authentication only. Never included in a bundle, VM environment or receipt. */
  credentials?: SourceCloudCredentials;
  sdk?: Pick<typeof Sandbox, "create" | "get">;
  fetch?: typeof globalThis.fetch;
  journal?: (entry: { phase: string; executionId: string; bundleHash: string; snapshotId: string; runtimeName: string; status?: string }) => Promise<void>;
}
export const SOURCE_CLOUD_VM_TIMEOUT_MS = 90_000;
const stoppedStates = new Set(["stopped", "aborted", "failed"]);

/** SDK 3.9.1 otherwise retries mutation network/429/5xx failures twice. Preserve one dispatch. */
export function sourceCloudFetch(rawFetch: typeof globalThis.fetch = globalThis.fetch): typeof globalThis.fetch {
  return async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.searchParams.get("resume") === "true") throw new DOMException("Source execution never resumes a VM.", "AbortError");
    const method = (options?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (["GET", "HEAD"].includes(method)) return rawFetch(input, options);
    let response: Response;
    try { response = await rawFetch(input, options); }
    catch (cause) { throw new DOMException("The original Sandbox mutation acknowledgement is unknown; it will not be dispatched again.", "AbortError"); }
    if (response.status === 429 || response.status >= 500) {
      // AbortError is the installed SDK's explicit no-retry branch. Preserve
      // the status in the error; no credential-bearing request is logged.
      const status = response.status;
      await response.body?.cancel().catch(() => {});
      throw new DOMException(`The original Sandbox mutation returned HTTP ${status}; no automatic retry is allowed.`, "AbortError");
    }
    return response;
  };
}

/** Reads only explicit configuration; it never loads application .env files. */
export function sourceCloudConfiguration(env: NodeJS.ProcessEnv = process.env): SourceCloudConfiguration {
  try {
    const identity = cloudRunnerIdentitySchema.parse(JSON.parse(env.FRACTURE_SOURCE_EXECUTION_RUNNER_JSON ?? "null"));
    const snapshotExpiresAt = env.FRACTURE_SOURCE_EXECUTION_SNAPSHOT_EXPIRES_AT ?? "";
    if (identity.suiteHash !== PUBLIC_SUITE_HASH || !Number.isFinite(Date.parse(snapshotExpiresAt)) || Date.parse(snapshotExpiresAt) <= Date.now()) throw new Error();
    return { identity, snapshotExpiresAt };
  } catch { throw new SourceExecutionError("SOURCE_EXECUTION_RUNNER_UNAVAILABLE", "An unexpired, separately qualified source-execution snapshot must be configured before a new plan can be prepared.", 503); }
}

export function cloudSourceBoundary(identity: CloudIdentity, verified: boolean) {
  return { configurationVerified: verified, engine: "vercel-sandbox" as const, snapshotId: identity.snapshotId, network: "deny_all" as const, rootFilesystem: "writable" as const, referenceFilesystem: "read_only" as const, referenceOwner: "root" as const, hostMounts: 0 as const, candidateUid: 1001 as const, candidateUser: "candidate" as const, supervisorUid: 0 as const, candidateCapabilities: "none" as const, supervisorCapabilities: ["SETUID", "SETGID"] as ["SETUID", "SETGID"], noNewPrivileges: true as const, credentialsForwarded: false as const, deadlineMs: SOURCE_LIMITS.caseDeadlineMs, outputLimitBytes: SOURCE_LIMITS.outputBytes, vmTimeoutMs: SOURCE_CLOUD_VM_TIMEOUT_MS, vcpus: 2 as const, memoryBytes: 4294967296 as const, pidsLimit: SOURCE_LIMITS.pids };
}

/** Every call receives one already-durable case identity. It never installs or executes source in the web process. */
export class CloudSourceExecutor implements SourceExecutor {
  readonly identity: CloudIdentity;
  private readonly sdk: Pick<typeof Sandbox, "create" | "get">;
  private readonly fetch: typeof globalThis.fetch;
  constructor(readonly configuration: SourceCloudConfiguration) {
    this.identity = cloudRunnerIdentitySchema.parse(configuration.identity);
    this.sdk = configuration.sdk ?? Sandbox;
    this.fetch = sourceCloudFetch(configuration.fetch);
  }
  async execute(input: SourceExecutionBundle, signal: AbortSignal): Promise<SourceExecutionReceipt> {
    const bundle = verifyBundle(input), name = bundle.binding.executionId;
    if (canonical(bundle.binding.runner) !== canonical(this.identity)) throw new SourceExecutionError("SOURCE_EXECUTION_RUNNER_MISMATCH", "This sealed case belongs to a different source runner.");
    if (Date.parse(bundle.deadlineAt) > Date.now() + SOURCE_LIMITS.caseDeadlineMs) throw new SourceExecutionError("SOURCE_EXECUTION_DEADLINE_INVALID", "The original case cannot extend its independent deadline.");
    if (!Number.isFinite(Date.parse(this.configuration.snapshotExpiresAt)) || Date.parse(this.configuration.snapshotExpiresAt) <= Date.now()) throw new SourceExecutionError("SOURCE_EXECUTION_SNAPSHOT_EXPIRED", "The qualified source runner snapshot expired; no VM was created.");
    const startedAt = new Date().toISOString(), digest = createHash("sha256"), abort = new AbortController();
    const requestSignal = AbortSignal.any([signal, abort.signal, AbortSignal.timeout(Math.max(1, Date.parse(bundle.deadlineAt) - Date.now()))]);
    const credentials = this.configuration.credentials ?? {};
    let vm: Sandbox | undefined, created = false, attemptedCreate = false, verified = false, outputBytes = 0, stderr = "", output = "", reason = "SOURCE_EXECUTION_NOT_STARTED", overflow = false;
    let result: ReturnType<typeof supervisorResultSchema.parse> | null = null;
    let disposal: SourceExecutionReceipt["disposal"] = { engine: "vercel-sandbox", state: "not_created", runtimeId: null, stopped: false, nonResumingReadVerified: false, status: null };
    const journal = (phase: string, status?: string) => this.configuration.journal?.({ phase, executionId: name, bundleHash: bundle.bundleHash, snapshotId: this.identity.snapshotId, runtimeName: name, ...(status ? { status } : {}) });
    if (signal.aborted || Date.parse(bundle.deadlineAt) <= Date.now()) reason = signal.aborted ? "SOURCE_EXECUTION_CANCELLED" : "SOURCE_EXECUTION_TIMEOUT";
    else try {
      await journal("create_intent");
      attemptedCreate = true;
      vm = await this.sdk.create({ ...credentials, fetch: this.fetch, name, source: { type: "snapshot", snapshotId: this.identity.snapshotId }, persistent: false, resources: { vcpus: 2 }, timeout: SOURCE_CLOUD_VM_TIMEOUT_MS, networkPolicy: "deny-all", tags: { project: "fracture-lab", purpose: "imported-source", execution: name }, signal: requestSignal });
      created = true;
      await journal("created");
      if (vm.name !== name || vm.persistent !== false || vm.networkPolicy !== "deny-all" || vm.sourceSnapshotId !== this.identity.snapshotId || Object.keys(vm.mounts ?? {}).length || vm.vcpus !== 2 || vm.memory !== 4096 || vm.timeout !== SOURCE_CLOUD_VM_TIMEOUT_MS) throw new SourceExecutionError("SOURCE_EXECUTION_ISOLATION_MISMATCH", "The actual VM does not match the approved source-execution boundary.");
      verified = true;
      if (requestSignal.aborted) throw new SourceExecutionError("SOURCE_EXECUTION_CANCELLED", "The original request ended before source dispatch.");
      const stdout = new Writable({ write(chunk: Buffer, _encoding, done) {
        digest.update(chunk); outputBytes += chunk.byteLength;
        if (outputBytes > SOURCE_LIMITS.outputBytes) { overflow = true; abort.abort(); done(new Error("Source supervisor output limit")); }
        else { output += String(chunk); done(); }
      } });
      stdout.on("error", () => {});
      const errors = new Writable({ write(chunk: Buffer, _encoding, done) { if (stderr.length < 16000) stderr += String(chunk).slice(0, 16000 - stderr.length); done(); } });
      errors.on("error", () => {});
      await journal("command_intent");
      // currentSession bypasses Sandbox.withResume. sudo applies only to the
      // trusted supervisor, whose bounding set is then exactly SETUID/SETGID.
      // The imported module and compiler run under UID1001 with no capabilities.
      const command = await vm.currentSession().runCommand({ sudo: true, cmd: "bash", args: ["-c", "ulimit -u 96; ulimit -f 65536; exec env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_ENV=production NODE_OPTIONS=--max-old-space-size=384 setpriv --bounding-set=-all,+setuid,+setgid --inh-caps=-all --ambient-caps=-all --no-new-privs timeout --signal=KILL 65s node --import tsx /reference/packages/source-execution/runner/main.ts"], cwd: "/reference", stdin: Readable.from([canonical(bundle)]), stdout, stderr: errors, timeoutMs: Math.max(1, Date.parse(bundle.deadlineAt) - Date.now()), signal: requestSignal });
      if (command.exitCode !== 0 || stderr.trim()) throw new SourceExecutionError([124, 137].includes(command.exitCode) ? "SOURCE_EXECUTION_TIMEOUT" : "SOURCE_EXECUTION_SUPERVISOR_UNCERTAIN", "The original supervisor did not return a complete accepted result.");
      result = supervisorResultSchema.parse(JSON.parse(output));
      if (canonical(result.binding) !== canonical(bundle.binding) || result.bundleHash !== bundle.bundleHash || result.observationHash !== objectHash(result.observation) || ["passed", "failed"].includes(result.status) && !result.supervisorProof.candidate) throw new SourceExecutionError("SOURCE_EXECUTION_OUTPUT_INTEGRITY", "The result does not bind the approved imported source and runner.");
      await journal("command_observed", result.status);
    } catch (error) {
      reason = overflow ? "SOURCE_EXECUTION_OUTPUT_LIMIT" : signal.aborted ? "SOURCE_EXECUTION_CANCELLED" : Date.parse(bundle.deadlineAt) <= Date.now() ? "SOURCE_EXECUTION_TIMEOUT" : error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_OUTCOME_UNKNOWN";
    } finally {
      if (attemptedCreate) {
        disposal = { engine: "vercel-sandbox", state: "unknown", runtimeId: name, stopped: false, nonResumingReadVerified: false, status: null };
        try {
          // A lost create acknowledgement is reconciled by its original name.
          // No command is issued to that recovered VM and no resume is allowed.
          vm ??= await this.sdk.get({ ...credentials, fetch: this.fetch, name, resume: false, signal: AbortSignal.timeout(10_000) });
          await journal("stop_intent");
          if (!stoppedStates.has(vm.status)) await vm.stop({ signal: AbortSignal.timeout(15_000) });
          const observed = await this.sdk.get({ ...credentials, fetch: this.fetch, name, resume: false, signal: AbortSignal.timeout(10_000) });
          const stopped = stoppedStates.has(observed.status);
          disposal = { engine: "vercel-sandbox", state: stopped ? "confirmed" : "unknown", runtimeId: name, stopped, nonResumingReadVerified: true, status: observed.status };
          await journal("disposal_observed", observed.status);
        } catch { await journal("disposal_unknown"); }
      }
    }
    const fallback: SourceExecutionReceipt["status"] = reason === "SOURCE_EXECUTION_CANCELLED" ? "cancelled" : reason === "SOURCE_EXECUTION_TIMEOUT" ? "timeout" : reason === "SOURCE_EXECUTION_OUTPUT_LIMIT" ? "output_limited" : reason === "SOURCE_EXECUTION_OUTPUT_INTEGRITY" ? "protocol_rejected" : "inconclusive";
    const observation = result?.observation ?? { reason, originalRuntimeName: name, created, isolationVerified: verified, supervisorOutputHash: digest.digest("hex"), supervisorOutputBytes: outputBytes, supervisorErrorHash: sha256(stderr), redispatchAllowed: false };
    const diagnostics = "No accepted compiler result was returned by the independent supervisor.";
    const body = { protocol: SOURCE_EXECUTION_PROTOCOL, binding: bundle.binding, bundleHash: bundle.bundleHash, status: result?.status ?? fallback, compiler: result?.compiler ?? { status: "not_started" as const, version: "typescript@5.9.3" as const, diagnostics, diagnosticsHash: sha256(diagnostics) }, assertions: result?.assertions ?? [], observation, observationHash: objectHash(observation), targetOutputHash: result?.targetOutputHash ?? sha256(""), targetOutputBytes: result?.targetOutputBytes ?? 0, isolation: cloudSourceBoundary(this.identity, verified), disposal, startedAt: result?.startedAt ?? startedAt, finishedAt: new Date().toISOString() };
    return verifySourceReceipt(sourceReceiptSchema.parse({ ...body, receiptHash: objectHash(body) }), bundle);
  }
}
