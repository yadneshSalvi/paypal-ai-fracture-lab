import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";
import { Worker } from "node:worker_threads";
import type { DeclaredSourceTool, IntegrationEdgeRelation, IntegrationNodeKind, SourceImportLimits, SourceIntegrationGraph, SourceIntegrationNode, SourceLanguageCoverage, SourceRiskCategory, SourceToolManifest } from "./types";
import { SourceWorkspaceError } from "./types";
import { GraphBuilder, graphResult, wholeFileSource } from "./graph";
import type { InspectedSource, InspectionFragment } from "./graph";
import { discoveredOrigins, objectHash, safeLabel, sourceSpan } from "./util";

interface TypeScriptWorkerResult { ok: boolean; code?: string; fragment: InspectionFragment; tools: DeclaredSourceTool[] }
async function typescriptWorker(sources: readonly InspectedSource[], limits: SourceImportLimits): Promise<TypeScriptWorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./inspector-worker.mjs", import.meta.url), {
      workerData: { sources, limits }, execArgv: [], env: { PATH: "/usr/bin:/bin", NODE_ENV: "production" },
      resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
    });
    let settled = false;
    const finish = async (value?: TypeScriptWorkerResult, error?: SourceWorkspaceError) => {
      if (settled) return; settled = true; clearTimeout(timer);
      await worker.terminate();
      if (error) reject(error); else resolve(value!);
    };
    const timer = setTimeout(() => { void finish(undefined, new SourceWorkspaceError("SOURCE_PARSER_LIMIT")); }, limits.parserTimeoutMs);
    worker.on("message", (value: TypeScriptWorkerResult) => {
      if (!value?.ok) void finish(undefined, new SourceWorkspaceError(value?.code === "SOURCE_PARSE_FAILED" ? "SOURCE_PARSE_FAILED" : "SOURCE_PARSER_LIMIT"));
      else void finish(value);
    });
    worker.on("error", () => { void finish(undefined, new SourceWorkspaceError("SOURCE_PARSER_LIMIT")); });
    worker.on("exit", () => { if (!settled) void finish(undefined, new SourceWorkspaceError("SOURCE_PARSER_LIMIT")); });
  });
}
interface PythonNode {
  id: number; kind: IntegrationNodeKind; label: string; line: number; column: number; endLine: number; endColumn: number;
  adapter?: SourceIntegrationNode["adapter"]; operation?: string; identity?: SourceIntegrationNode["identity"]; origin?: string;
}
interface PythonResult { path: string; nodes: PythonNode[]; edges: { a: number; b: number; relation: IntegrationEdgeRelation; node: number }[]; risks: { category: SourceRiskCategory; node: number }[] }
async function pythonWorker(sources: readonly InspectedSource[], limits: SourceImportLimits, executable: string, cwd: string): Promise<{ results: PythonResult[]; memoryLimitApplied: boolean }> {
  const inspector = await readFile(new URL("./python-inspector.py", import.meta.url), "utf8");
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["-I", "-S", "-B", "-c", inspector], { cwd, env: { PATH: "/usr/bin:/bin", NODE_ENV: "production" }, stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let bytes = 0, errorBytes = 0, settled = false;
    const fail = (code: "SOURCE_PARSE_FAILED" | "SOURCE_PARSER_LIMIT") => {
      if (settled) return; settled = true; clearTimeout(timer); child.kill("SIGKILL"); reject(new SourceWorkspaceError(code));
    };
    const timer = setTimeout(() => fail("SOURCE_PARSER_LIMIT"), limits.parserTimeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 8 * 1024 * 1024) fail("SOURCE_PARSER_LIMIT"); else chunks.push(chunk); });
    child.stderr.on("data", (chunk: Buffer) => { errorBytes += chunk.length; if (errorBytes > 64 * 1024) fail("SOURCE_PARSER_LIMIT"); });
    child.on("error", () => fail("SOURCE_PARSE_FAILED"));
    child.stdin.on("error", () => { /* Exit handling below returns a sanitized parser error. */ });
    child.on("close", code => {
      if (settled) return;
      clearTimeout(timer);
      try {
        if (code !== 0) { fail("SOURCE_PARSER_LIMIT"); return; }
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { ok: boolean; code?: string; results?: PythonResult[]; memoryLimitApplied?: boolean };
        if (!parsed.ok || !Array.isArray(parsed.results)) { fail(parsed.code === "SOURCE_PARSE_FAILED" ? "SOURCE_PARSE_FAILED" : "SOURCE_PARSER_LIMIT"); return; }
        settled = true; resolve({ results: parsed.results, memoryLimitApplied: parsed.memoryLimitApplied === true });
      } catch { fail("SOURCE_PARSE_FAILED"); }
    });
    child.stdin.end(JSON.stringify({ sources, limits }));
  });
}
const riskCopy: Record<SourceRiskCategory, { title: string; explanation: string }> = {
  missing_provider_identity: { title: "Payment write has no resolved provider request identity", explanation: "No recognized provider identity is supplied at this syntax site. Headers, wrappers and actual endpoint enforcement need independent evidence." },
  generic_identity_reliance: { title: "Generic identity needs endpoint evidence", explanation: "A generic identity header appears without a resolved provider request identity. F9 must establish endpoint-specific behavior before any defect claim." },
  unverified_webhook: { title: "Webhook signature verification is unresolved", explanation: "No recognized verification call appears directly in this handler. Delegated middleware or dynamic verification remains unresolved." },
  unknown_outcome_without_reread: { title: "Exception branch needs unknown-outcome reconciliation", explanation: "A failed status follows a payment write exception without a recognized reread in that handler. Whether the request was sent and any delegated recovery require runtime review." },
  fulfillment_without_capture_evidence: { title: "Fulfillment needs completed capture evidence", explanation: "Python AST inspection locates the fulfillment action but does not prove a completed-capture guard across Python control flow. This is an unresolved safety obligation, not a reproduced defect." },
  unresolved_payment_call: { title: "Payment call requires adapter inspection", explanation: "Dynamic options, receiver binding or delegated wrappers prevent operation-contract and request-identity verification." },
};
function mergePython(builder: GraphBuilder, source: InspectedSource, result: PythonResult): void {
  const byId = new Map<number, SourceIntegrationNode>();
  const lines = source.content.split("\n");
  const lineOffsets: number[] = [];
  let offset = 0;
  for (const line of lines) { lineOffsets.push(offset); offset += line.length + 1; }
  const position = (line: number, byteColumn: number) => {
    const text = lines[line - 1];
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(byteColumn) || text === undefined || byteColumn < 0 || byteColumn > Buffer.byteLength(text)) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    const prefix = Buffer.from(text).subarray(0, byteColumn).toString("utf8");
    if (Buffer.byteLength(prefix) !== byteColumn) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    return lineOffsets[line - 1]! + prefix.length;
  };
  if (result.nodes.length > builder.limits.maxGraphNodes || result.edges.length > builder.limits.maxGraphEdges || result.risks.length > builder.limits.maxFindings) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
  for (const node of result.nodes) {
    const span = node.kind === "file" ? wholeFileSource(source) : sourceSpan(source.manifest.path, source.manifest.hash, source.content, position(node.line, node.column), position(node.endLine, node.endColumn));
    const attributes: Partial<Pick<SourceIntegrationNode, "adapter" | "operation" | "identity" | "origin">> = {};
    if (node.adapter) attributes.adapter = node.adapter;
    if (node.operation) attributes.operation = safeLabel(node.operation);
    if (node.identity) attributes.identity = node.identity;
    if (node.origin && discoveredOrigins(node.origin).includes(node.origin)) attributes.origin = node.origin;
    const graphNode = builder.addNode(node.kind, safeLabel(node.label), span, "python_ast", ["state_write", "fulfillment", "reconciliation", "webhook", "commerce_intent"].includes(node.kind) ? "inferred" : node.adapter === "unresolved" ? "unresolved" : "syntax", attributes);
    byId.set(node.id, graphNode);
  }
  for (const edge of result.edges) {
    const a = byId.get(edge.a), b = byId.get(edge.b), evidence = byId.get(edge.node);
    if (!a || !b || !evidence) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    builder.addEdge(a.id, b.id, edge.relation, evidence.evidence, ["may_reconcile", "may_fulfill", "targets"].includes(edge.relation) ? "inferred" : "syntax");
  }
  for (const finding of result.risks) {
    const node = byId.get(finding.node), copy = riskCopy[finding.category];
    if (!node || !copy) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    builder.addFinding({ category: finding.category, severity: ["generic_identity_reliance", "unresolved_payment_call", "fulfillment_without_capture_evidence"].includes(finding.category) ? "unverified" : "risk", ...copy, nodeIds: [node.id], evidence: [node.evidence], ...(finding.category === "generic_identity_reliance" ? { providerFactId: "F9" as const } : {}) });
  }
}

export async function inspectSources(sources: readonly InspectedSource[], limits: SourceImportLimits, options: { pythonExecutable?: string; cwd: string }): Promise<{ graph: SourceIntegrationGraph; tools: SourceToolManifest }> {
  const tsResult = await typescriptWorker(sources, limits);
  const builder = new GraphBuilder(limits); builder.merge(tsResult.fragment);
  const pythonSources = sources.filter(source => source.manifest.language === "python");
  let pythonMemoryLimitApplied = false;
  if (pythonSources.length && options.pythonExecutable) {
    const inspected = await pythonWorker(pythonSources, limits, options.pythonExecutable, options.cwd);
    const results = inspected.results; pythonMemoryLimitApplied = inspected.memoryLimitApplied;
    if (results.length !== pythonSources.length) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    for (const source of pythonSources) { const result = results.find(item => item.path === source.manifest.path); if (!result) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED"); mergePython(builder, source, result); }
  }
  for (const source of sources) if (!["typescript", "javascript"].includes(source.manifest.language) && !(source.manifest.language === "python" && options.pythonExecutable)) builder.addNode("file", source.manifest.path, wholeFileSource(source), source.manifest.language === "python" ? "static_unresolved" : "manifest", source.manifest.language === "python" ? "unresolved" : "syntax");
  const files = new Map(builder.nodes.filter(node => node.kind === "file").map(node => [node.evidence.source.path, node]));
  for (const link of builder.imports) {
    const base = posix.normalize(posix.join(posix.dirname(link.source.path), link.module));
    if (base.startsWith("../") || posix.isAbsolute(base)) continue;
    const stem = base.replace(/\.(?:js|mjs|cjs)$/, "");
    const candidates = [base, `${stem}.ts`, `${stem}.tsx`, `${stem}.mts`, `${stem}.cts`, `${stem}.js`, `${stem}.jsx`, `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`];
    const target = candidates.map(path => files.get(path)).find(Boolean);
    if (target) builder.addEdge(link.from, target.id, "imports", { type: "typescript_ast", source: link.source });
  }
  for (const tool of tsResult.tools) {
    const node = builder.addNode("declared_tool", tool.name, tool.source, "manifest");
    const parent = files.get(tool.source.path); if (parent) builder.addEdge(parent.id, node.id, "contains", node.evidence);
    for (const origin of tool.outboundOrigins) { const target = builder.addNode("outbound_destination", origin, tool.source, "manifest", "syntax", { origin }); builder.addEdge(node.id, target.id, "targets", target.evidence); }
  }
  const languages = [...new Set(sources.map(source => source.manifest.language))];
  const coverage: SourceLanguageCoverage[] = languages.map(language => {
    const count = sources.filter(source => source.manifest.language === language).length;
    const parsed = ["typescript", "javascript"].includes(language);
    const python = language === "python" && !!options.pythonExecutable;
    return { language, status: parsed ? "parsed" : python || language === "json" ? "partial" : "unsupported", files: count, parsedFiles: parsed || python ? count : language === "json" ? sources.filter(source => /(?:^|\/)package\.json$/.test(source.manifest.path)).length : 0, limitations: parsed ? ["Compiler AST only; type checking, dynamic imports and arbitrary framework execution are not performed."] : python ? ["Python ast.parse only; receiver binding and control flow are partial, and fulfillment guards remain unresolved.", "Python source is capped at 128 KiB per file, with AST node/depth, CPU and wall-time bounds.", pythonMemoryLimitApplied ? "The host accepted a 256 MiB process data limit." : "This host refused a hard process memory limit; Python parsing is not a qualified execution-isolation boundary."] : language === "python" ? ["A trusted Python interpreter was not configured. Python files are retained without claiming an AST map."] : ["Only supported build declarations are inspected; no language-complete analysis is claimed."] };
  });
  const toolBody = { schemaVersion: "fracture.source-tools/v1" as const, tools: tsResult.tools, dependencyManifests: sources.filter(source => /(?:^|\/)(?:package\.json|pyproject\.toml|requirements[^/]*\.txt)$/.test(source.manifest.path)).map(source => ({ path: source.manifest.path, hash: source.manifest.hash })), lockfiles: sources.filter(source => /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|uv\.lock)$/.test(source.manifest.path)).map(source => ({ path: source.manifest.path, hash: source.manifest.hash })), commandsExecuted: 0 as const, dependenciesInstalled: false as const };
  return { graph: graphResult(builder, coverage), tools: { ...toolBody, hash: objectHash(toolBody) } };
}
