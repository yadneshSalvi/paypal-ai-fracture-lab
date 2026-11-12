/** Owner-run local worker for the recorded editor loop. Runs one already-approved imported-source job in the qualified Docker image. */
import { randomUUID } from "node:crypto";
import { getService } from "../packages/service/src/index";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { SourceExecutionService } from "../packages/source-execution/src/service";
import { DockerSourceExecutor } from "../packages/source-execution/src/docker";
import { localDockerRunnerIdentity } from "../packages/developer-tools/src/source-runner";

const jobId = process.argv[2];
if (!jobId || process.argv.length !== 3) throw new Error("Usage: tsx scripts/record-editor-loop-worker.ts <approved job UUID>. One job; no listener.");
const identity = localDockerRunnerIdentity();
if (!identity) throw new Error("Set FRACTURE_SOURCE_EXECUTION_DOCKER_RUNNER_JSON to the exact qualified local image identity.");
const service = await getService();
try {
  let host = ""; try { host = new URL(process.env.DATABASE_URL ?? "").hostname; } catch { /* reported below without the value */ }
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) throw new Error("This worker only runs against the local application database.");
  const execution = new SourceExecutionService(service.store, new SourceAccessStore(service.store), identity);
  const job = await execution.runNext("editor-loop-" + randomUUID(), new DockerSourceExecutor({ identity }), { jobId });
  console.log(JSON.stringify({ jobId: job?.id ?? null, status: job?.status ?? "not_claimed", cases: job?.cases.map(item => ({ scenarioId: item.scenarioId, status: item.status, executionId: item.executionId })) ?? [], sourceIncluded: false, provider: "sample_local_model", network: "none" }, null, 2));
} finally { await service.store.db.close(); }
