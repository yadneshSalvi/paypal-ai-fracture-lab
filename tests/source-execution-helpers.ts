import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, realpath, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { SqliteDatabase } from "@fracture/paypal-core";
import { initializeDatabase } from "../packages/service/src/database";
import { LabStore } from "../packages/service/src/store";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { createSourceWorkspaceStore } from "../packages/source-workspaces/src/index";
import { importLocalSource } from "../packages/developer-tools/src/source-import";
import { initializeSourceExecution, SourceExecutionService, SOURCE_EXECUTION_PROTOCOL, PUBLIC_SUITE_HASH, SOURCE_LIMITS, objectHash, sha256 } from "../packages/source-execution/src/index";
import type { SourceExecutionBundle, SourceExecutionReceipt, SourceRunnerIdentity } from "../packages/source-execution/src/index";
import { PUBLIC_ASSERTION_IDS } from "../packages/source-execution/src/receipt";
export const controlledRunner: SourceRunnerIdentity = { protocol: SOURCE_EXECUTION_PROTOCOL, engine: "docker", imageId: "sha256:" + "1".repeat(64), snapshotHash: "2".repeat(64), runnerHash: "3".repeat(64), suiteHash: PUBLIC_SUITE_HASH, adapterHash: "4".repeat(64), dependencyHash: "5".repeat(64) };
/** Persistence/protocol test double only; this is never reported as an actual isolated execution. */
export function controlledReceipt(bundle: SourceExecutionBundle, status: SourceExecutionReceipt["status"] = "passed", disposal: "confirmed" | "unknown" = "confirmed"): SourceExecutionReceipt {
  const observation = ["passed", "failed"].includes(status) ? { testDouble: true, scenarioId: bundle.binding.scenarioId } : null;
  const compiler = { status: status === "compiler_rejected" ? "rejected" as const : "passed" as const, version: "typescript@5.9.3" as const, diagnostics: "", diagnosticsHash: sha256("") };
  const isolation = { configurationVerified: true, engine: "docker" as const, imageId: controlledRunner.engine === "docker" ? controlledRunner.imageId : "", network: "none" as const, rootFilesystem: "read_only" as const, referenceFilesystem: "read_only" as const, hostMounts: 0 as const, candidateUid: 1000 as const, supervisorUid: 0 as const, candidateCapabilities: "none" as const, noNewPrivileges: true as const, supervisorCapabilities: ["SETUID", "SETGID"] as ["SETUID", "SETGID"], credentialsForwarded: false as const, memoryBytes: SOURCE_LIMITS.memoryBytes, pidsLimit: SOURCE_LIMITS.pids, deadlineMs: SOURCE_LIMITS.caseDeadlineMs, outputLimitBytes: SOURCE_LIMITS.outputBytes };
  const body = { protocol: SOURCE_EXECUTION_PROTOCOL, binding: bundle.binding, bundleHash: bundle.bundleHash, status, compiler, assertions: observation ? PUBLIC_ASSERTION_IDS.map((id,index) => ({ id, passed: status === "passed" || index > 0 })) : [], observation, observationHash: objectHash(observation), targetOutputHash: sha256(""), targetOutputBytes: 0, isolation, disposal: { state: disposal, runtimeId: "controlled-protocol-double", removed: disposal === "confirmed", verifiedAbsent: disposal === "confirmed" }, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() };
  return { ...body, receiptHash: objectHash(body) };
}
export async function setupSourceExecution(t: TestContext, options: { variant?: "faulty" | "corrected"; files?: Record<string, string>; retainedDirectory?: string } = {}) {
  const retained = Boolean(options.retainedDirectory);
  const directory = options.retainedDirectory ? (await mkdir(options.retainedDirectory, { mode: 0o700 }), await realpath(options.retainedDirectory)) : await realpath(await mkdtemp(join(tmpdir(), "fracture-source-execution-"))), authorized = join(directory, "authorized"), repo = join(authorized, "repo");
  await mkdir(repo, { recursive: true, mode: 0o700 });
  let contents = options.files;
  if (!contents) { contents = {}; const f = new URL("./source-execution-fixtures/" + (options.variant ?? "corrected") + "/", import.meta.url); for (const name of await readdir(f)) contents[name.replace(/\.txt$/, "")] = await readFile(new URL(name, f), "utf8"); }
  for (const [name, content] of Object.entries(contents)) { await mkdir(join(repo, name, ".."), { recursive: true }); await writeFile(join(repo, name), content); }
  const databasePath = retained ? join(directory,"state.sqlite") : ":memory:"; const db = new SqliteDatabase(databasePath); if(retained){await chmod(databasePath,0o600);await db.query("PRAGMA synchronous=FULL");} await initializeDatabase(db); await initializeSourceExecution(db); const lab = new LabStore(db), session = await lab.createSession("owner"), grantId = randomUUID();
  await db.query("INSERT INTO lab_developer_grants(id,session_id,secret_hash,created_at,expires_at) VALUES($1,$2,$3,$4,$5)", [grantId, session.id, sha256("controlled-source-execution-only"), session.createdAt, session.expiresAt]);
  const owner = { sessionId: session.id, grantId }; let now = Date.now();
  const sources = new SourceAccessStore(lab, () => now), local = await createSourceWorkspaceStore({ storageRoot: join(directory, "private"), allowedRoots: [{ id: "owned", directory: authorized }] });
  const imported = await importLocalSource(sources, owner, { rootId: "owned", path: "repo", title: "Controlled imported checkout", requestId: randomUUID() }, local);
  const service = new SourceExecutionService(lab, sources, controlledRunner, { now: () => now });
  t.after(async () => { await db.close(); if(!retained)await rm(directory, { recursive: true, force: true }); });
  const prepare = (scenarioIds: Parameters<typeof service.prepare>[1]["scenarioIds"] = ["happy", "lost"]) => service.prepare(owner, { importId: imported.import.id, entryPath: "entry.ts", expectedRevisionHash: imported.snapshot!.revisionHash, scenarioIds, seed: "source-execution-unit-v1", requestId: randomUUID() });
  return { directory, databasePath, repo, db, lab, owner, sources, local, imported, service, prepare, now: () => now, advance: (ms: number) => { now += ms; } };
}
