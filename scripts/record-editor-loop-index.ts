/**
 * Builds docs/editor-loop/session.json (the file the /editor-loop page imports) from the published
 * per-session summaries plus one retained hand-authored control run, read from the lab's records.
 *
 *   tsx scripts/record-editor-loop-index.ts <control credential file> <control job UUID> <session-id>...
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const [credentialFile, controlJob, ...sessionIds] = process.argv.slice(2);
if (!credentialFile || !controlJob || !sessionIds.length) throw new Error("Usage: record-editor-loop-index.ts <control credential file> <control job UUID> <session-id>...");
const repo = fs.realpathSync(path.resolve(fileURLToPath(new URL("..", import.meta.url)))), root = path.join(repo, "docs/editor-loop");
process.env.FRACTURE_WORKSPACE_ROOT = repo; process.env.FRACTURE_DEVELOPER_CREDENTIAL_FILE = path.resolve(credentialFile);
const { getService } = await import("../packages/service/src/index");
const { DeveloperAccess, readCredential } = await import("../packages/developer-tools/src/access");
const { DeveloperRuntime, toolDefinitions } = await import("../packages/developer-tools/src/runtime");
const service = await getService();
try {
  const credential = await readCredential(); const access = new DeveloperAccess(service); await access.initialize(); await access.authorize(credential);
  const results = await new DeveloperRuntime(service, credential).call("get_source_execution_results", { jobId: controlJob }) as { jobId: string; planId: string; planHash: string; importId: string; revisionHash: string; status: string; passed: number; total: number; runnerEngine: string; cases: { scenarioId: string; status: string; assertions: { id: string; passed: boolean }[]; observed: Record<string, unknown> | null; invariants: { id: string; name: string; verdict: string; reason: string }[] }[] };
  const control = { label: "Hand-authored faulty control. Not an agent session.", origin: "tests/source-execution-fixtures/faulty (the repository's deliberately defective multi-file checkout), imported and run through the same CLI tools and the same isolated runner", jobId: results.jobId, planId: results.planId, planHash: results.planHash, importId: results.importId, revisionHash: results.revisionHash, status: results.status, passed: results.passed, total: results.total, runnerEngine: results.runnerEngine,
    cases: results.cases.map(item => ({ scenarioId: item.scenarioId, status: item.status, failedAssertions: item.assertions.filter(assertion => !assertion.passed).map(assertion => assertion.id), observed: item.observed, failedInvariants: item.invariants.filter(row => row.verdict === "fail").map(row => ({ id: row.id, name: row.name, reason: row.reason })) })) };
  const sessions = sessionIds.map(id => JSON.parse(fs.readFileSync(path.join(root, id, "session.json"), "utf8")) as Record<string, unknown>);
  const body = { schemaVersion: 1, title: "Recorded editor loop", provider: "Sample provider model", runner: "isolated local Docker runner", mcpTools: Object.keys(toolDefinitions).length, sessions, control };
  fs.writeFileSync(path.join(root, "session.json"), JSON.stringify(body, null, 2) + "\n");
  console.log(JSON.stringify({ sessions: sessionIds, control: { jobId: control.jobId, passed: control.passed, total: control.total }, mcpTools: body.mcpTools }));
} finally { await service.store.db.close(); }
