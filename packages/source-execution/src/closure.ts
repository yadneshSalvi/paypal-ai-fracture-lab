import path from "node:path";
import ts from "typescript";
import type { SourceSnapshotExport } from "../../contracts/src/source-workspaces";
import { sourceFileSchema, portableSourcePath, closureSchema, executionBundleSchema, sourcePlanSchema } from "./schemas";
import type { SourceClosure, SourceExecutionBundle, SourcePlan } from "./schemas";
import { SOURCE_LIMITS, PUBLIC_SUITE_HASH } from "./limits";
import { objectHash, sha256, canonical } from "./hash";
import { SourceExecutionError, integrityFailed } from "./errors";
const allowedRuntime = new Set(["@fracture/paypal-core", "node:crypto"]);
const allowedType = new Set([...allowedRuntime, "@fracture/source-target", "@fracture/contracts"]);
const ambient = new Set(["process", "global", "globalThis", "require", "eval", "Function", "Reflect", "module", "exports", "__dirname", "__filename", "WebSocket", "XMLHttpRequest", "WebTransport"]);
const unsafeMembers = new Set(["constructor", "prototype", "__proto__", "getPrototypeOf", "setPrototypeOf", "getOwnPropertyDescriptors", "getOwnPropertyDescriptor", "getOwnPropertyNames", "getOwnPropertySymbols", "defineProperty", "defineProperties"]);
const fail = (code: string, message: string, file: string | null = null): never => { throw new SourceExecutionError(code, message, 422, file); };
export function sourceModuleEdges(filePath: string, content: string): { specifier: string; typeOnly: boolean }[] {
  const file = ts.createSourceFile(filePath, content, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  if (file.referencedFiles.length || file.typeReferenceDirectives.length || file.libReferenceDirectives.length || file.amdDependencies.length) fail("SOURCE_EXECUTION_REFERENCE_UNSUPPORTED", "Triple-slash and AMD dependencies are not part of the sealed relative module closure.", filePath);
  const diagnostics = ts.transpileModule(content, { fileName: filePath, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics ?? [];
  if (diagnostics.some(item => item.category === ts.DiagnosticCategory.Error)) fail("SOURCE_EXECUTION_SYNTAX", "This module has invalid TypeScript syntax. Correct it and import a new snapshot.", filePath);
  const result: { specifier: string; typeOnly: boolean }[] = [];
  const add = (value: ts.Node, typeOnly: boolean) => {
    if (!ts.isStringLiteral(value)) fail("SOURCE_EXECUTION_DYNAMIC_MODULE", "Module references must be literal relative paths or explicitly supported pinned dependencies.", filePath);
    result.push({ specifier: (value as ts.StringLiteral).text, typeOnly });
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const only = Boolean(clause?.isTypeOnly || (!clause?.name && clause?.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every(item => item.isTypeOnly)));
      add(node.moduleSpecifier, only);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) add(node.moduleSpecifier, node.isTypeOnly || Boolean(node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 && node.exportClause.elements.every(item => item.isTypeOnly)));
    if (ts.isImportTypeNode(node)) {
      if (!ts.isLiteralTypeNode(node.argument)) fail("SOURCE_EXECUTION_DYNAMIC_MODULE", "Type imports must identify an exact supported module.", filePath);
      add((node.argument as ts.LiteralTypeNode).literal, true);
    }
    if (ts.isImportEqualsDeclaration(node) || ts.isExportAssignment(node) && node.isExportEquals || ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isMetaProperty(node)) fail("SOURCE_EXECUTION_DYNAMIC_MODULE", "Dynamic imports, CommonJS loading and import.meta are unsupported. Use literal TypeScript modules.", filePath);
    if (ts.isComputedPropertyName(node) || ts.isElementAccessExpression(node) && !ts.isNumericLiteral(node.argumentExpression)) fail("SOURCE_EXECUTION_CAPABILITY", "Computed object capabilities are outside this bounded adapter. Use declared properties or numeric array indexes.", filePath);
    if (ts.isIdentifier(node) && ambient.has(node.text)) fail("SOURCE_EXECUTION_CAPABILITY", "Process, global, dynamic execution and network capabilities are unavailable in this bounded checkout adapter.", filePath);
    if ((ts.isIdentifier(node) || ts.isStringLiteral(node)) && unsafeMembers.has(node.text)) fail("SOURCE_EXECUTION_CAPABILITY", "Prototype mutation and reflective execution are outside this adapter contract.", filePath);
    ts.forEachChild(node, visit);
  };
  visit(file); return result;
}
function resolveModule(from: string, specifier: string, typeOnly: boolean, files: Map<string, { path: string }>): string | null {
  if (!specifier.startsWith(".")) {
    if (!(typeOnly ? allowedType : allowedRuntime).has(specifier)) fail("SOURCE_EXECUTION_DEPENDENCY_UNSUPPORTED", `Unsupported ${typeOnly ? "type" : "runtime"} dependency '${specifier}'. Adapt it to a snapshot-relative TypeScript module or a documented pinned capability. No dependencies are installed.`, from);
    return null;
  }
  if (/[:\\\u0000-\u001f\u007f?#]/.test(specifier)) fail("SOURCE_EXECUTION_PATH", "Module imports must use portable literal relative paths.", from);
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  if (!portableSourcePath.safeParse(resolved).success || resolved.startsWith("../") || path.posix.isAbsolute(resolved)) fail("SOURCE_EXECUTION_PATH", "A module import escapes the accepted source snapshot.", from);
  const choices = new Set<string>();
  if (/\.js$/.test(resolved)) { choices.add(resolved); choices.add(resolved.slice(0, -3) + ".ts"); }
  else if (/\.[a-zA-Z0-9]+$/.test(resolved)) choices.add(resolved);
  else { choices.add(resolved + ".ts"); choices.add(resolved + "/index.ts"); if (typeOnly) choices.add(resolved + ".d.ts"); }
  const matched = [...choices].filter(name => files.has(name));
  if (matched.length !== 1) fail(matched.length ? "SOURCE_EXECUTION_MODULE_AMBIGUOUS" : "SOURCE_EXECUTION_MODULE_MISSING", matched.length ? "The relative import resolves to multiple snapshot files. Select an explicit unambiguous TypeScript path." : `The accepted snapshot has no supported module for '${specifier}'. Import its source bytes explicitly.`, from);
  const selected = matched[0]!;
  if (!selected.endsWith(".ts") || selected.endsWith(".d.ts") && !typeOnly) fail("SOURCE_EXECUTION_LANGUAGE_UNSUPPORTED", "Only TypeScript .ts runtime modules and type-only declarations are supported.", selected);
  return selected;
}
export function closureFromFiles(files: readonly { path: string; hash: string; bytes: number; content: string }[], entryPath: string): SourceClosure {
  if (!portableSourcePath.safeParse(entryPath).success || !entryPath.endsWith(".ts") || entryPath.endsWith(".d.ts")) fail("SOURCE_EXECUTION_ENTRY_UNSUPPORTED", "Choose an exact TypeScript .ts entrypoint exporting async checkout(context).", entryPath);
  const available = new Map<string, (typeof files)[number]>(), folded = new Set<string>();
  for (const file of files) {
    if (!portableSourcePath.safeParse(file.path).success || file.path.split("/").some(part => part.startsWith("."))) fail("SOURCE_EXECUTION_PATH", "The source snapshot contains a nonportable or escaping path.", file.path);
    const key = file.path.toLowerCase();
    if (folded.has(key)) fail("SOURCE_EXECUTION_CASE_COLLISION", "The accepted snapshot contains duplicate or case-colliding paths. Import an unambiguous revision.", file.path);
    folded.add(key); available.set(file.path, file);
  }
  if (!available.has(entryPath)) fail("SOURCE_EXECUTION_ENTRY_MISSING", "The exact selected entrypoint is absent from the accepted source snapshot.", entryPath);
  const included = new Map<string, (typeof files)[number]>(), edges: SourceClosure["edges"] = [];
  let totalBytes = 0;
  const visit = (name: string, runtime: boolean) => {
    const file = available.get(name)!;
    if (included.has(name)) return;
    if (["package.json", "tsconfig.json", "node_modules"].includes(name.split("/")[0]!)) fail("SOURCE_EXECUTION_PATH", "This selected source module conflicts with a trusted runner control path.", name);
    const parsed = sourceFileSchema.safeParse({ path: file.path, hash: file.hash, bytes: file.bytes, content: file.content });
    if (!parsed.success || sha256(file.content) !== file.hash || Buffer.byteLength(file.content) !== file.bytes) throw integrityFailed();
    if (!name.endsWith(".ts") || name.endsWith(".d.ts") && runtime) fail("SOURCE_EXECUTION_LANGUAGE_UNSUPPORTED", "The selected closure must contain TypeScript modules; unsupported languages are not executed.", name);
    included.set(name, file); totalBytes += file.bytes;
    if (included.size > SOURCE_LIMITS.maxFiles || totalBytes > SOURCE_LIMITS.maxBytes) fail("SOURCE_EXECUTION_CLOSURE_LIMIT", "The selected closure exceeds 64 files or 2 MiB. Provide a smaller explicit checkout adapter.", name);
    for (const dependency of sourceModuleEdges(name, file.content)) {
      const target = resolveModule(name, dependency.specifier, dependency.typeOnly, available);
      edges.push({ from: name, specifier: dependency.specifier, to: target, typeOnly: dependency.typeOnly });
      if (target) visit(target, !dependency.typeOnly);
    }
  };
  visit(entryPath, true);
  const body = { entryPath, files: [...included.values()].map(file => ({ path: file.path, hash: file.hash, bytes: file.bytes, content: file.content })).sort((a, b) => a.path.localeCompare(b.path)), edges: edges.sort((a, b) => canonical(a).localeCompare(canonical(b))), totalBytes };
  return closureSchema.parse({ ...body, closureHash: objectHash(body) });
}
export function closureFromSnapshot(report: SourceSnapshotExport, entryPath: string): SourceClosure {
  const { contentHash, ...body } = report;
  if (objectHash(body) !== contentHash || report.view.import.access !== "owner" || report.view.import.status !== "ready" || !report.view.snapshot || report.view.snapshot.execution.status !== "static_only" || report.view.snapshot.graph.runtimeObserved !== false || report.execution.runtimeObserved !== false) throw integrityFailed();
  const snapshot = report.view.snapshot;
  if (report.files.length !== snapshot.files.length || report.files.some(file => { const item = snapshot.files.find(row => row.path === file.path); return !item || item.hash !== file.hash || item.bytes !== file.bytes; })) throw integrityFailed();
  return closureFromFiles(report.files, entryPath);
}
export function verifyPlan(value: unknown): SourcePlan {
  const plan = sourcePlanSchema.parse(value); const { planHash, ...body } = plan;
  if (objectHash(body) !== planHash || plan.suiteHash !== PUBLIC_SUITE_HASH || plan.runner.suiteHash !== plan.suiteHash || plan.runner.adapterHash !== plan.adapterHash || new Set(plan.scenarioIds).size !== plan.scenarioIds.length || canonical(closureFromFiles(plan.closure.files, plan.entryPath)) !== canonical(plan.closure)) throw integrityFailed();
  return plan;
}
export function verifyBundle(value: unknown): SourceExecutionBundle {
  const bundle = executionBundleSchema.parse(value); const { bundleHash, ...body } = bundle;
  const closure = closureFromFiles(bundle.files, bundle.entryPath);
  if (bundle.binding.executionId !== "fracture-source-" + bundle.binding.caseId || objectHash(body) !== bundleHash || closure.closureHash !== bundle.binding.closureHash || canonical(bundle.edges) !== canonical(closure.edges) || bundle.binding.suiteHash !== PUBLIC_SUITE_HASH || bundle.binding.runner.suiteHash !== bundle.binding.suiteHash || bundle.binding.runner.adapterHash !== bundle.binding.adapterHash) throw integrityFailed();
  return bundle;
}
