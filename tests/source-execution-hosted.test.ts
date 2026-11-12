import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Sandbox } from "@vercel/sandbox";
import { SourceExecutionService, objectHash, sha256, verifySourceReceipt } from "../packages/source-execution/src/index";
import type { SourceExecutionBundle, SourceExecutionReceipt } from "../packages/source-execution/src/schemas";
import { CloudSourceExecutor, sourceCloudFetch, SOURCE_CLOUD_VM_TIMEOUT_MS } from "../packages/source-execution/src/cloud";
import { PUBLIC_ASSERTION_IDS } from "../packages/source-execution/src/receipt";
import { setupSourceExecution, controlledReceipt, controlledRunner } from "./source-execution-helpers";

test("durable one-case steps retain a failure, original case IDs and plan across independent claims", async t => {
  const f = await setupSourceExecution(t), { plan } = await f.prepare(["lost", "happy"]);
  const { job } = await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  const admitted: string[] = [];
  const executor = { async execute(bundle: SourceExecutionBundle) { admitted.push(bundle.binding.executionId); return controlledReceipt(bundle, bundle.binding.scenarioId === "lost" ? "failed" : "passed"); } };
  const first = await f.service.runNext("durable-step-1", executor, { jobId: job.id, maximumCases: 1 });
  assert.equal(first?.status, "queued");
  assert.deepEqual(first?.cases.map(c => c.status), ["failed", "pending"]);
  const second = await f.service.runNext("durable-step-2", executor, { jobId: job.id, maximumCases: 1 });
  assert.equal(second?.status, "failed");
  assert.deepEqual(second?.cases.map(c => c.id), job.cases.map(c => c.id));
  assert.equal(new Set(admitted).size, 2);
  assert.deepEqual(admitted, job.cases.map(c => c.executionId));
  assert.equal(await f.service.runNext("duplicate-wakeup", executor, { jobId: job.id, maximumCases: 1 }), null);
  assert.equal(admitted.length, 2);
  const report = await f.service.report(f.owner, { jobId: job.id });
  assert.equal(report.plan.planHash, plan.planHash);
  assert.equal(report.events.filter((e: unknown) => (e as { kind: string }).kind === "case_checkpoint").length, 1);
});

test("cancellation between durable steps keeps the accepted failure and prevents every remaining dispatch", async t => {
  const f = await setupSourceExecution(t), { plan } = await f.prepare(["lost", "happy"]);
  const { job } = await f.service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  let calls = 0;
  const executor = { async execute(bundle: SourceExecutionBundle) { calls++; return controlledReceipt(bundle, "failed"); } };
  await f.service.runNext("first", executor, { jobId: job.id, maximumCases: 1 });
  const stopped = await f.service.cancel(f.owner, { jobId: job.id, requestId: randomUUID() });
  assert.deepEqual(stopped.job.cases.map(c => c.status), ["failed", "cancelled"]);
  assert.equal(await f.service.runNext("later", executor, { jobId: job.id, maximumCases: 1 }), null);
  assert.equal(calls, 1);
});

test("installed Sandbox SDK cannot retry an ambiguous create through the guarded fetch", async () => {
  let calls = 0;
  await assert.rejects(Sandbox.create({ name: "source-unit-no-provider", token: "unit-token-no-real-authority", teamId: "team_unit", projectId: "prj_unit", fetch: sourceCloudFetch(async () => { calls++; return new Response("unavailable", { status: 503 }); }) }), error => error instanceof Error && error.name === "AbortError");
  assert.equal(calls, 1);
  await assert.rejects(sourceCloudFetch(async () => { calls++; throw new Error("must not reach network"); })("https://api.vercel.com/v2/sandboxes/unit?resume=true"), error => error instanceof Error && error.name === "AbortError");
  assert.equal(calls, 1);
});

test("cloud receipt double binds UID1001, writable VM, exact snapshot and a fresh nonresuming stopped read", async t => {
  const f = await setupSourceExecution(t);
  const { imageId: _image, ...common } = controlledRunner as Extract<typeof controlledRunner, {engine:"docker"}>;
  const identity = { ...common, engine: "vercel-sandbox" as const, snapshotId: "snap_controlled_source_double" };
  const service = new SourceExecutionService(f.lab, f.sources, identity);
  const { plan } = await service.prepare(f.owner, { importId: f.imported.import.id, entryPath: "entry.ts", expectedRevisionHash: f.imported.snapshot!.revisionHash, scenarioIds: ["happy"], seed: "cloud-receipt-double", requestId: randomUUID() });
  const { job } = await service.approve(f.owner, { planId: plan.id, expectedPlanHash: plan.planHash, requestId: randomUUID() });
  let state = "running", commands = 0, reads = 0, creates = 0;
  let sealed: SourceExecutionBundle | undefined;
  const vm = {
    name: job.cases[0]!.executionId, persistent: false, networkPolicy: "deny-all", sourceSnapshotId: identity.snapshotId, mounts: {}, vcpus: 2, memory: 4096, timeout: SOURCE_CLOUD_VM_TIMEOUT_MS,
    get status() { return state; },
    currentSession() { return { async runCommand(options: { stdin: AsyncIterable<Buffer>; stdout: { write(value: string): void }; sudo: boolean; args: string[] }) {
      commands++; assert.equal(options.sudo, true); assert.match(options.args.join(" "), /setpriv --bounding-set=-all,\+setuid,\+setgid/);
      let text = ""; for await (const chunk of options.stdin) text += String(chunk); sealed = JSON.parse(text) as SourceExecutionBundle;
      const observation = { testDouble: true, source: "sample", captureCount: 1, capturedMinor: 1200 };
      options.stdout.write(JSON.stringify({ protocol: sealed.binding.protocol, binding: sealed.binding, bundleHash: sealed.bundleHash, status: "passed", compiler: { status: "passed", version: "typescript@5.9.3", diagnostics: "", diagnosticsHash: sha256("") }, assertions: PUBLIC_ASSERTION_IDS.map(id => ({ id, passed: true })), observation, observationHash: objectHash(observation), targetOutputHash: sha256(""), targetOutputBytes: 0, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), supervisorProof: { uid: 0, effectiveCapabilities: "00000000000000c0", noNewPrivileges: true, immutableReferenceVerified: true, sourceBeforeAfterVerified: true, candidate: { uid: 1001, gid: 1001, effectiveCapabilities: "0000000000000000", permittedCapabilities: "0000000000000000", noNewPrivileges: true } } }));
      return { exitCode: 0 };
    } }; },
    async stop() { state = "stopped"; return { status: state }; },
  };
  const sdk = { async create(options: Record<string, unknown>) { creates++; assert.equal(options.env, undefined); assert.equal(options.persistent, false); assert.deepEqual(options.source, { type: "snapshot", snapshotId: identity.snapshotId }); return vm; }, async get(options: { resume: boolean }) { reads++; assert.equal(options.resume, false); return vm; } } as unknown as Pick<typeof Sandbox, "create" | "get">;
  const executor = new CloudSourceExecutor({ identity, snapshotExpiresAt: new Date(Date.now()+86_400_000).toISOString(), sdk });
  const result = await service.runNext("cloud-double", executor, { jobId: job.id, maximumCases: 1 });
  assert.equal(result?.status, "passed"); assert.equal(creates, 1); assert.equal(commands, 1); assert.equal(reads, 1);
  const report = await service.report(f.owner, { jobId: job.id });
  const receipt = report.artifacts.find(a => a.kind === "executor_receipt")!.value as SourceExecutionReceipt;
  assert.equal(receipt.isolation.candidateUid, 1001); assert.equal(receipt.isolation.rootFilesystem, "writable");
  assert.ok("engine" in receipt.disposal); assert.equal(receipt.disposal.state, "confirmed");
  const forged = structuredClone(receipt); forged.disposal = { state: "confirmed", runtimeId: "double", removed: true, verifiedAbsent: true };
  const { receiptHash: _hash, ...forgedBody } = forged; forged.receiptHash = objectHash(forgedBody);
  assert.throws(() => verifySourceReceipt(forged, sealed!));
});
