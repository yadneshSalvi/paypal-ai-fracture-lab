/**
 * Publishes one recorded editor-loop session from its private control directory:
 * a scrubbed transcript, the exact submitted revisions, and a machine-readable summary.
 * Everything is read from the recording and from the lab's retained records; nothing is authored here.
 *
 *   tsx scripts/record-editor-loop-publish.ts <workdir> <session-id> "<condition label>"
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [workdirArg, sessionName, condition] = process.argv.slice(2);
if (!workdirArg || !sessionName || !condition || !/^[a-z0-9-]{1,40}$/.test(sessionName)) throw new Error("Usage: record-editor-loop-publish.ts <workdir> <session-id> \"<condition label>\"");
const repo = fs.realpathSync(path.resolve(fileURLToPath(new URL("..", import.meta.url))));
const workdir = fs.realpathSync(workdirArg), control = path.join(workdir, "control"), kit = path.join(workdir, "bramble-checkout-kit");
const out = path.join(repo, "docs/editor-loop", sessionName);
process.env.FRACTURE_WORKSPACE_ROOT = repo;
process.env.FRACTURE_DEVELOPER_CREDENTIAL_FILE = fs.readFileSync(path.join(control, "credential-path"), "utf8").trim();
const { getService } = await import("../packages/service/src/index");
const { DeveloperAccess, readCredential } = await import("../packages/developer-tools/src/access");
const { DeveloperRuntime, toolDefinitions } = await import("../packages/developer-tools/src/runtime");

type Json = Record<string, unknown>;
const lines = (file: string) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
const raw = lines(path.join(control, "transcript.jsonl")).map(line => JSON.parse(line) as Json);
const prompts = fs.readFileSync(path.join(control, "prompts.txt"), "utf8").split("\n-----\n").map(item => item.trim()).filter(Boolean);
const ownerActions = lines(path.join(control, "owner-actions.jsonl")).map(line => JSON.parse(line) as Json);
const developerSession = JSON.parse(fs.readFileSync(path.join(control, "developer-session.json"), "utf8")) as { developerSessionId: string };
const kitVariant = fs.existsSync(path.join(control, "kit-variant")) ? fs.readFileSync(path.join(control, "kit-variant"), "utf8").trim() : "full";

// ---- scrubbing -------------------------------------------------------------------------------
const home = os.homedir(), user = os.userInfo().username;
const replacements: [string, string][] = [[kit, "<kit>"], [kit.replace(/^\/private/, ""), "<kit>"], [workdir, "<workdir>"], [workdir.replace(/^\/private/, ""), "<workdir>"], [repo, "<repo>"], [home, "~"]];
const scrub = (text: string) => { let value = text; for (const [from, to] of replacements) value = value.split(from).join(to); return value.replace(/~\/\.claude\/projects\/[^"\\\s]*/g, "<agent-session-store>").replace(/\/(?:private\/)?tmp\/claude-\d+\/[^"\\\s]*/g, "<tmp>").split(user).join("<user>"); };
const secretPatterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/, /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s"]+/i, /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_.=-]{16,}/, /\bAIza[A-Za-z0-9_-]{25,}/, /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, /"secret"\s*:\s*"[a-f0-9]{32,}"/];
const assertPublishable = (label: string, text: string) => { for (const pattern of secretPatterns) { const hit = text.match(pattern); if (hit) throw new Error(`Refusing to publish ${label}: credential-shaped content matched ${pattern}.`); } if (text.includes(home) || text.includes("/Users/")) throw new Error(`Refusing to publish ${label}: an absolute home path remains.`); };
function publicLine(entry: Json): Json | null {
  if (entry.type === "rate_limit_event") return null; // account quota telemetry, not part of the session
  if (entry.type === "system" && entry.subtype === "init") return { type: "system", subtype: "init", session_id: entry.session_id, model: entry.model, claude_code_version: entry.claude_code_version, permissionMode: entry.permissionMode, cwd: "<kit>", tools: entry.tools, mcp_servers: entry.mcp_servers };
  if (entry.type === "system") return null; // harness lifecycle noise
  const copy = JSON.parse(JSON.stringify(entry)) as Json, message = copy.message as { content?: unknown } | undefined;
  if (Array.isArray(message?.content)) for (const block of message.content as Json[]) delete block.signature; // opaque thinking signatures
  return copy;
}
const transcript = raw.map(publicLine).filter((entry): entry is Json => entry !== null).map(entry => scrub(JSON.stringify(entry)));

// ---- turns -----------------------------------------------------------------------------------
interface ToolCall { name: string; target: string | null; error: boolean }
interface Turn { n: number; prompt: string; model: string; toolCalls: ToolCall[]; reply: string; factIdsCited: string[]; durationMs: number | null; agentSteps: number | null }
const turns: Turn[] = []; let current: Turn | null = null; const pendingTools = new Map<string, ToolCall>();
for (const entry of raw) {
  if (entry.type === "system" && entry.subtype === "init") { current = { n: turns.length + 1, prompt: scrub(prompts[turns.length] ?? ""), model: String(entry.model), toolCalls: [], reply: "", factIdsCited: [], durationMs: null, agentSteps: null }; turns.push(current); continue; }
  if (!current) continue;
  const content = (entry.message as { content?: unknown } | undefined)?.content;
  if (entry.type === "assistant" && Array.isArray(content)) for (const block of content as Json[]) {
    if (block.type === "tool_use") { const input = (block.input ?? {}) as Json; const call: ToolCall = { name: String(block.name).replace(/^mcp__fracture-lab__/, "fracture-lab:"), target: typeof input.file_path === "string" ? scrub(input.file_path).replace(/^<kit>\//, "") : typeof input.jobId === "string" ? input.jobId : typeof input.path === "string" ? input.path : typeof input.pattern === "string" ? input.pattern : null, error: false }; current.toolCalls.push(call); pendingTools.set(String(block.id), call); }
    if (block.type === "text") for (const id of String(block.text).match(/\bF(?:1[0-2]|[1-9])\b/g) ?? []) if (!current.factIdsCited.includes(id)) current.factIdsCited.push(id);
  }
  if (entry.type === "user" && Array.isArray(content)) for (const block of content as Json[]) if (block.type === "tool_result" && block.is_error) { const call = pendingTools.get(String(block.tool_use_id)); if (call) call.error = true; }
  if (entry.type === "result") { current.reply = scrub(String(entry.result ?? "")); current.durationMs = typeof entry.duration_ms === "number" ? entry.duration_ms : null; current.agentSteps = typeof entry.num_turns === "number" ? entry.num_turns : null; }
}
const init = raw.find(entry => entry.type === "system" && entry.subtype === "init")!;

// ---- submissions from the lab's retained records -----------------------------------------------
const service = await getService();
interface Submission { n: number; turn: number; importId: string; snapshotId: string; revisionHash: string; planId: string; planHash: string; jobId: string; approvedAt: string; status: string; passed: number; total: number; runner: Json; seed: string; files: { path: string; bytes: number; hash: string; published: string }[]; cases: Json[] }
const submissions: Submission[] = []; const sources: Record<string, string>[] = [];
try {
  const credential = await readCredential(); const access = new DeveloperAccess(service); await access.initialize(); await access.authorize(credential);
  const runtime = new DeveloperRuntime(service, credential);
  for (const action of ownerActions.filter(item => item.action === "approve_source_execution")) {
    const plan = await runtime.call("get_source_execution_plan", { planId: action.planId }) as { id: string; importId: string; snapshotId: string; revisionHash: string; planHash: string; seed: string; runner: Json; closure: { files: { path: string; bytes: number; hash: string; content: string }[] } };
    const results = await runtime.call("get_source_execution_results", { jobId: action.jobId }) as { status: string; passed: number; total: number; cases: Json[] };
    const n = submissions.length + 1, directory = path.join(out, "revisions", String(n)); fs.mkdirSync(directory, { recursive: true });
    const files = plan.closure.files.map(file => { const published = path.join("revisions", String(n), file.path + ".txt"); assertPublishable(published, file.content); fs.mkdirSync(path.dirname(path.join(out, published)), { recursive: true }); fs.writeFileSync(path.join(out, published), file.content); return { path: file.path, bytes: file.bytes, hash: file.hash, published: `docs/editor-loop/${sessionName}/${published}` }; });
    sources.push(Object.fromEntries(plan.closure.files.map(file => [file.path, file.content])));
    const turn = turns.findIndex(item => item.reply.includes(plan.id) || item.toolCalls.some(call => call.name === "fracture-lab:prepare_source_execution") && item.reply.includes(plan.planHash)) + 1;
    submissions.push({ n, turn, importId: plan.importId, snapshotId: plan.snapshotId, revisionHash: plan.revisionHash, planId: plan.id, planHash: plan.planHash, jobId: String(action.jobId), approvedAt: String(action.at), status: results.status, passed: results.passed, total: results.total, runner: plan.runner, seed: plan.seed, files,
      cases: results.cases.map(item => { const value = item as { scenarioId: string; status: string; errorCode: string | null; compiler: Json | null; assertions: { id: string; passed: boolean }[]; observed: Json | null; invariants: { id: string; name: string; verdict: string; reason: string }[]; disposal: unknown; caseId: string; receiptHash: string | null }; return { scenarioId: value.scenarioId, caseId: value.caseId, status: value.status, errorCode: value.errorCode, receiptHash: value.receiptHash, compilerStatus: value.compiler?.status ?? null, compilerDiagnostics: value.compiler?.diagnostics ? scrub(String(value.compiler.diagnostics)) : null, failedAssertions: value.assertions.filter(assertion => !assertion.passed).map(assertion => assertion.id), assertionCount: value.assertions.length, observed: value.observed, failedInvariants: value.invariants.filter(row => row.verdict === "fail").map(row => ({ id: row.id, name: row.name, reason: row.reason })), disposal: value.disposal }; }) });
  }
} finally { await service.store.db.close(); }

// ---- diffs between consecutive submitted revisions ------------------------------------------------
const diffs = submissions.slice(1).map((submission, index) => {
  const before = sources[index]!, after = sources[index + 1]!, temp = fs.mkdtempSync(path.join(os.tmpdir(), "editor-loop-diff-"));
  const files = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().map(file => {
    const a = path.join(temp, "a"), b = path.join(temp, "b"); fs.writeFileSync(a, before[file] ?? ""); fs.writeFileSync(b, after[file] ?? "");
    const result = spawnSync("diff", ["-u", "--label", `revision ${index + 1}/${file}`, "--label", `revision ${index + 2}/${file}`, a, b], { encoding: "utf8", maxBuffer: 8_000_000 });
    const unified = result.stdout ?? ""; const body = unified.split("\n").slice(2);
    return { path: file, status: !(file in before) ? "added" : !(file in after) ? "removed" : unified ? "changed" : "unchanged", added: body.filter(line => line.startsWith("+")).length, removed: body.filter(line => line.startsWith("-")).length, unified };
  });
  fs.rmSync(temp, { recursive: true, force: true });
  const text = files.map(file => file.unified).join(""); fs.writeFileSync(path.join(out, `revision-${index + 1}-to-${index + 2}.diff`), text);
  return { from: index + 1, to: index + 2, fromRevisionHash: submissions[index]!.revisionHash, toRevisionHash: submission.revisionHash, published: `docs/editor-loop/${sessionName}/revision-${index + 1}-to-${index + 2}.diff`, files };
});

// ---- facts and context the agent actually read ----------------------------------------------------
const lookups = turns.flatMap(turn => turn.toolCalls.filter(call => call.name === "fracture-lab:get_provider_facts" || call.name === "Read" && /^reference\//.test(call.target ?? "")).map(call => ({ turn: turn.n, tool: call.name, target: call.target, kind: call.name === "Read" ? call.target!.startsWith("reference/paypal-sdk/") ? "APIMatic SDK map" : call.target!.startsWith("reference/fracture-paypal-core/") ? "payment-core declarations" : "adapter contract" : "published provider facts" })));

fs.mkdirSync(out, { recursive: true });
const transcriptText = transcript.join("\n") + "\n"; assertPublishable("transcript", transcriptText); fs.writeFileSync(path.join(out, "transcript.jsonl"), transcriptText);
const firstBehavioural = submissions.find(item => item.cases.some(entry => (entry as { compilerStatus: string | null }).compilerStatus === "passed"));
const summary = {
  schemaVersion: 1, id: sessionName, condition, recordedOn: String(ownerActions[0]?.at ?? "").slice(0, 10), kitVariant,
  agent: { harness: "Claude Code (headless: claude -p, stream-json output)", version: String(init.claude_code_version), model: String(init.model), sessionId: String(init.session_id), builtInTools: ["Read", "Write", "Edit", "Glob", "Grep"], mcpServer: "fracture-lab (local stdio)", mcpToolsOffered: Object.keys(toolDefinitions).length, mcpToolsAllowed: ["list_source_roots", "import_source_workspace", "list_source_workspaces", "get_source_workspace", "read_source_file", "check_source_changes", "prepare_source_execution", "get_source_execution_plan", "get_source_execution", "get_source_execution_results", "list_source_executions", "get_source_execution_command", "get_provider_facts", "list_experiments"] },
  environment: { provider: "Sample provider model (local). No request reached PayPal and no money moved.", runner: "Local Docker container per case: network none, read-only root, no host mounts, non-root candidate", database: "local PostgreSQL", developerSessionId: developerSession.developerSessionId },
  outcome: { submissions: submissions.length, firstSubmission: submissions[0] ? { status: submissions[0].status, passed: submissions[0].passed, total: submissions[0].total } : null, firstExecutedSubmission: firstBehavioural ? { n: firstBehavioural.n, status: firstBehavioural.status, passed: firstBehavioural.passed, total: firstBehavioural.total } : null, finalSubmission: submissions.length ? { n: submissions.at(-1)!.n, status: submissions.at(-1)!.status, passed: submissions.at(-1)!.passed, total: submissions.at(-1)!.total } : null },
  turns: turns.map(turn => ({ n: turn.n, prompt: turn.prompt, model: turn.model, durationMs: turn.durationMs, agentSteps: turn.agentSteps, tools: Object.entries(turn.toolCalls.reduce<Record<string, { count: number; errors: number }>>((all, call) => { const item = all[call.name] ??= { count: 0, errors: 0 }; item.count++; if (call.error) item.errors++; return all; }, {})).map(([name, value]) => ({ name, ...value })), factIdsCited: turn.factIdsCited, reply: turn.reply })),
  ownerActions: ownerActions.map(action => JSON.parse(scrub(JSON.stringify(action))) as Json), lookups, submissions, diffs,
  files: { transcript: `docs/editor-loop/${sessionName}/transcript.jsonl`, summary: `docs/editor-loop/${sessionName}/session.json` },
};
const summaryText = JSON.stringify(summary, null, 2) + "\n"; assertPublishable("summary", summaryText); fs.writeFileSync(path.join(out, "session.json"), summaryText);
console.log(JSON.stringify({ session: sessionName, turns: turns.length, submissions: submissions.map(item => ({ n: item.n, jobId: item.jobId, status: item.status, passed: item.passed, total: item.total })), transcriptLines: transcript.length, out: `docs/editor-loop/${sessionName}` }, null, 2));
