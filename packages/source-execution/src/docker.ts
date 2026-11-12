import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import {createHash} from "node:crypto";
import path from "node:path";
import type { SourceExecutionBundle, SourceExecutionReceipt, SourceExecutor, SourceRunnerIdentity } from "./schemas";
import { dockerRunnerIdentitySchema, sourceReceiptSchema } from "./schemas";
import { verifyBundle } from "./closure";
import { supervisorResultSchema } from "./protocol";
import { verifySourceReceipt } from "./receipt";
import { SOURCE_LIMITS, SOURCE_EXECUTION_PROTOCOL } from "./limits";
import { canonical, objectHash, sha256 } from "./hash";
import { SourceExecutionError } from "./errors";
type DockerIdentity = Extract<SourceRunnerIdentity, { engine: "docker" }>;
const defaultDocker = "/Applications/Docker.app/Contents/Resources/bin/docker";
export interface DockerSourceConfiguration { identity: DockerIdentity; dockerExecutable?: string; dockerConfigDirectory?: string }
export const dockerSourceBoundary = (identity: DockerIdentity, verified: boolean) => ({ configurationVerified: verified, engine: "docker" as const, imageId: identity.imageId, network: "none" as const, rootFilesystem: "read_only" as const, referenceFilesystem: "read_only" as const, hostMounts: 0 as const, candidateUid: 1000 as const, supervisorUid: 0 as const, candidateCapabilities: "none" as const, noNewPrivileges: true as const, supervisorCapabilities: ["SETUID", "SETGID"] as ["SETUID", "SETGID"], credentialsForwarded: false as const, memoryBytes: SOURCE_LIMITS.memoryBytes, pidsLimit: SOURCE_LIMITS.pids, deadlineMs: SOURCE_LIMITS.caseDeadlineMs, outputLimitBytes: SOURCE_LIMITS.outputBytes });
/** New Docker lane only. Construction never starts Docker; execute requires an already qualified immutable image. */
export class DockerSourceExecutor implements SourceExecutor {
  private readonly identity: DockerIdentity;
  private readonly docker: string;
  private readonly env: NodeJS.ProcessEnv;
  constructor(configuration: DockerSourceConfiguration) {
    this.identity = dockerRunnerIdentitySchema.parse(configuration.identity); this.docker = configuration.dockerExecutable ?? defaultDocker;
    if (!path.isAbsolute(this.docker)) throw new SourceExecutionError("SOURCE_EXECUTION_DOCKER_CONFIGURATION", "Use a trusted absolute Docker executable.");
    this.env = { NODE_ENV: "production", PATH: "/usr/bin:/bin:/usr/sbin:/sbin", DOCKER_CONFIG: configuration.dockerConfigDirectory ?? path.join(homedir(), ".docker"), NO_COLOR: "1" };
  }
  private command(args: string[], timeout = 10000) { return spawnSync(this.docker, ["--context", "colima-fracture-lab", ...args], { env: this.env, encoding: "utf8", timeout, maxBuffer: 2_500_000, stdio: ["ignore", "pipe", "pipe"] }); }
  private dispose(name: string): SourceExecutionReceipt["disposal"] {
    const removed = this.command(["rm", "--force", name], 10000), inspected = this.command(["container", "inspect", "--format", "{{.Id}}", name], 5000);
    const absent = inspected.status === 1 && /No such (?:object|container):/.test(String(inspected.stderr));
    return { state: absent ? "confirmed" : "unknown", runtimeId: name, removed: absent && (removed.status === 0 || /No such (?:object|container):/.test(String(removed.stderr))), verifiedAbsent: absent };
  }
  async execute(input: SourceExecutionBundle, signal: AbortSignal): Promise<SourceExecutionReceipt> {
    const bundle = verifyBundle(input);
    if (canonical(bundle.binding.runner) !== canonical(this.identity)) throw new SourceExecutionError("SOURCE_EXECUTION_RUNNER_MISMATCH", "The sealed case belongs to a different qualified runner.");
    if (Date.parse(bundle.deadlineAt) > Date.now() + SOURCE_LIMITS.caseDeadlineMs) throw new SourceExecutionError("SOURCE_EXECUTION_DEADLINE_INVALID", "A sealed bundle cannot extend the independent runner deadline.");
    const startedAt = new Date().toISOString(), name = bundle.binding.executionId, supervisorOutputDigest = createHash("sha256");
    let verified = false, created = false, result: ReturnType<typeof supervisorResultSchema.parse> | null = null, code = "SOURCE_EXECUTION_NOT_STARTED", outputBytes = 0, outputHash = sha256("");
    let disposal: SourceExecutionReceipt["disposal"] = { state: "not_created", runtimeId: null, removed: false, verifiedAbsent: true };
    if (signal.aborted || Date.parse(bundle.deadlineAt) <= Date.now()) code = signal.aborted ? "SOURCE_EXECUTION_CANCELLED" : "SOURCE_EXECUTION_TIMEOUT";
    else {
      try {
        const container = this.command(["create", "--interactive", "--name", name, "--network", "none", "--read-only", "--cap-drop", "ALL", "--cap-add", "SETUID", "--cap-add", "SETGID", "--security-opt", "no-new-privileges", "--memory", "512m", "--cpus", "1", "--pids-limit", String(SOURCE_LIMITS.pids), "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=128m", "--user", "0:0", this.identity.imageId], 15000);
        if (container.status !== 0 || !/^[a-f0-9]{64}$/.test(String(container.stdout).trim())) throw new SourceExecutionError("SOURCE_EXECUTION_CREATE_UNKNOWN", "The new runtime's acceptance is uncertain. Its original name is retained.");
        created = true;
        const inspected = this.command(["inspect", name]);
        if (inspected.status !== 0) throw new SourceExecutionError("SOURCE_EXECUTION_INSPECTION_UNKNOWN", "The new runtime boundary could not be established.");
        const item = JSON.parse(String(inspected.stdout))[0] as { Image: string; Config: { User: string; Env: string[] }; HostConfig: { NetworkMode: string; ReadonlyRootfs: boolean; Binds: unknown[] | null; CapDrop: string[]; CapAdd: string[]; SecurityOpt: string[]; Memory: number; PidsLimit: number; NanoCpus: number; Tmpfs: Record<string, string> }; Mounts: unknown[] };
        if (item.Image !== this.identity.imageId || item.Config.User !== "0:0" || item.HostConfig.NetworkMode !== "none" || !item.HostConfig.ReadonlyRootfs || item.Mounts.length || item.HostConfig.Binds?.length || item.HostConfig.Memory !== SOURCE_LIMITS.memoryBytes || item.HostConfig.PidsLimit !== SOURCE_LIMITS.pids || item.HostConfig.NanoCpus !== SOURCE_LIMITS.cpuNano || !item.HostConfig.CapDrop.includes("ALL") || item.HostConfig.CapAdd.map(value => value.replace(/^CAP_/, "")).sort().join(",") !== "SETGID,SETUID" || !item.HostConfig.SecurityOpt.some(value => value.startsWith("no-new-privileges")) || !["nosuid", "nodev", "noexec", "size=128m"].every(value => item.HostConfig.Tmpfs["/tmp"]?.split(",").includes(value)) || item.Config.Env.some(value => !/^(?:PATH|NODE_VERSION|YARN_VERSION|NODE_ENV)=/.test(value))) throw new SourceExecutionError("SOURCE_EXECUTION_ISOLATION_MISMATCH", "The actual runtime differs from the approved isolation boundary.");
        verified = true;
        if (signal.aborted) throw new SourceExecutionError("SOURCE_EXECUTION_CANCELLED", "Cancellation stopped the runtime before source dispatch.");
        const output = await new Promise<string>((resolve, reject) => {
          const child = spawn(this.docker, ["--context", "colima-fracture-lab", "start", "--attach", "--interactive", name], { env: this.env, stdio: ["pipe", "pipe", "pipe"] }); let stdout = "", stderr = "", settled = false, abortGrace: ReturnType<typeof setTimeout> | undefined;
          const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); if (abortGrace) clearTimeout(abortGrace); signal.removeEventListener("abort", abort); if (error) { child.kill("SIGKILL"); reject(error); } else resolve(stdout); };
          const abort = () => { if (abortGrace || settled) return; this.command(["kill", "--signal", "TERM", name], 3000); abortGrace = setTimeout(() => finish(new SourceExecutionError("SOURCE_EXECUTION_CANCELLED", "The original source execution was cancelled; no complete supervisor acknowledgment was obtained.")), 7000); };
          const timer = setTimeout(() => finish(new SourceExecutionError("SOURCE_EXECUTION_TIMEOUT", "The bounded runtime deadline elapsed.")), Math.max(1, Date.parse(bundle.deadlineAt) - Date.now())); signal.addEventListener("abort", abort, { once: true });
          child.stdout.on("data", (chunk: Buffer) => { if(settled)return; supervisorOutputDigest.update(chunk); outputBytes += chunk.byteLength; if (outputBytes > SOURCE_LIMITS.outputBytes) finish(new SourceExecutionError("SOURCE_EXECUTION_OUTPUT_LIMIT", "The supervisor output exceeded its bounded protocol.")); else stdout += String(chunk); });
          child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 16000) stderr += String(chunk).slice(0, 16000 - stderr.length); });
          child.on("error", () => finish(new SourceExecutionError("SOURCE_EXECUTION_ATTACH_UNKNOWN", "The original attach outcome is unknown.")));
          child.on("close", status => finish((status === 0 || signal.aborted && stdout.trim().startsWith("{")) && !stderr ? undefined : new SourceExecutionError("SOURCE_EXECUTION_SUPERVISOR_UNCERTAIN", "The supervisor ended without an accepted source-bound proof.")));
          child.stdin.on("error", () => {}); child.stdin.end(canonical(bundle)); if (signal.aborted) abort();
        });
        result = supervisorResultSchema.parse(JSON.parse(output));
        if (canonical(result.binding) !== canonical(bundle.binding) || result.bundleHash !== bundle.bundleHash || result.observationHash !== objectHash(result.observation) || ["passed", "failed"].includes(result.status) && !result.supervisorProof.candidate) throw new SourceExecutionError("SOURCE_EXECUTION_OUTPUT_INTEGRITY", "The supervisor response did not match its sealed source and original runner.");
      } catch (error) { code = error instanceof SourceExecutionError ? error.code : "SOURCE_EXECUTION_PROTOCOL_REJECTED"; }
      finally { outputHash = supervisorOutputDigest.digest("hex"); disposal = this.dispose(name); }
    }
    const fallbackStatus: SourceExecutionReceipt["status"] = code === "SOURCE_EXECUTION_CANCELLED" ? "cancelled" : code === "SOURCE_EXECUTION_TIMEOUT" ? "timeout" : code === "SOURCE_EXECUTION_OUTPUT_LIMIT" ? "output_limited" : code.includes("PROTOCOL") || code.includes("OUTPUT_INTEGRITY") ? "protocol_rejected" : "inconclusive";
    const observation = result ? result.observation : { reason: code, originalRuntimeName: name, created, isolationVerified: verified, supervisorOutputHash: outputHash, supervisorOutputBytes: outputBytes, redispatchAllowed: false };
    const body = { protocol: SOURCE_EXECUTION_PROTOCOL, binding: bundle.binding, bundleHash: bundle.bundleHash, status: result?.status ?? fallbackStatus, compiler: result?.compiler ?? { status: "not_started" as const, version: "typescript@5.9.3" as const, diagnostics: "No accepted compiler result was returned by the independent supervisor.", diagnosticsHash: sha256("No accepted compiler result was returned by the independent supervisor.") }, assertions: result?.assertions ?? [], observation, observationHash: objectHash(observation), targetOutputHash: result?.targetOutputHash ?? sha256(""), targetOutputBytes: result?.targetOutputBytes ?? 0, isolation: dockerSourceBoundary(this.identity, verified), disposal, startedAt: result?.startedAt ?? startedAt, finishedAt: new Date().toISOString() };
    return verifySourceReceipt(sourceReceiptSchema.parse({ ...body, receiptHash: objectHash(body) }), bundle);
  }
}
