import { extname, isAbsolute, posix } from "node:path";
import { SourceWorkspaceError } from "./types";
import type { SourceExclusionReason, SourceImportLimits, SourceLanguage } from "./types";

export const DEFAULT_SOURCE_LIMITS: Readonly<SourceImportLimits> = Object.freeze({
  maxFiles: 1_000, maxEntries: 4_000, maxTotalBytes: 12 * 1024 * 1024, maxFileBytes: 512 * 1024,
  maxDepth: 20, maxPathLength: 240, maxParserNodes: 60_000, maxSyntaxDepth: 200,
  maxGraphNodes: 15_000, maxGraphEdges: 30_000, maxFindings: 4_000, parserTimeoutMs: 4_000,
});
const HARD_LIMITS: SourceImportLimits = {
  maxFiles: 4_000, maxEntries: 16_000, maxTotalBytes: 48 * 1024 * 1024, maxFileBytes: 1024 * 1024,
  maxDepth: 32, maxPathLength: 400, maxParserNodes: 150_000, maxSyntaxDepth: 300,
  maxGraphNodes: 30_000, maxGraphEdges: 60_000, maxFindings: 8_000, parserTimeoutMs: 15_000,
};
export function sourceLimits(input: Partial<SourceImportLimits> = {}): SourceImportLimits {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
  for (const key of Object.keys(input)) if (!(key in DEFAULT_SOURCE_LIMITS)) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
  const result = { ...DEFAULT_SOURCE_LIMITS, ...input };
  for (const key of Object.keys(result) as (keyof SourceImportLimits)[]) if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > HARD_LIMITS[key]) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
  return Object.freeze(result);
}
const dependencies = new Set(["node_modules", "vendor", "venv", "env", "site-packages", "__pypackages__", "bower_components"]);
const generated = new Set(["dist", "build", "coverage", "__pycache__", "target", "out", "artifacts", "plans"]);
const secretName = /(?:^|[._-])(?:credentials?|secrets?|private[-_]?key|id_rsa|id_ed25519)(?:[._-]|$)|\.(?:pem|key|p12|pfx|keystore|sqlite|db|log)$/i;
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".py", ".json", ".md", ".txt", ".toml", ".yaml", ".yml", ".sql", ".graphql", ".gql", ".html", ".css", ".sh", ".lock"]);
const exactNames = new Set(["Dockerfile", "Makefile", "Procfile", "LICENSE", "COPYING", "NOTICE", "requirements.txt"]);
export function exclusionForName(name: string, isDirectory: boolean): SourceExclusionReason | undefined {
  if (name.startsWith(".") || secretName.test(name)) return "hidden_or_secret_path";
  if (dependencies.has(name.toLowerCase())) return "dependency_tree";
  if (generated.has(name.toLowerCase())) return "generated_tree";
  if (!isDirectory && !extensions.has(extname(name).toLowerCase()) && !exactNames.has(name)) return "unsupported_file";
  return undefined;
}
export function portableRelativePath(value: unknown, maxLength: number, allowRoot = false): string {
  if (typeof value !== "string" || !value || value.length > maxLength || isAbsolute(value) || value.includes("\\") || /[%\x00-\x1f\x7f:]/.test(value)) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
  if (allowRoot && value === ".") return value;
  const parts = value.split("/");
  if (parts.some(part => !part || part === "." || part === ".." || part.startsWith(".") || !/^[A-Za-z0-9@_+ ()[\].-]+$/.test(part)) || posix.normalize(value) !== value) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
  return value;
}
export function assertSelectablePath(path: string): void {
  if (path !== "." && path.split("/").some(part => exclusionForName(part, true))) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
}
export function sourceLanguage(path: string): SourceLanguage {
  const extension = extname(path).toLowerCase();
  return [".ts", ".tsx", ".mts", ".cts"].includes(extension) ? "typescript" : [".js", ".jsx", ".mjs", ".cjs"].includes(extension) ? "javascript" : extension === ".py" ? "python" : extension === ".json" ? "json" : "text";
}
const allowedPlaceholder = /^(?:|\.{3}|\*+|<[A-Za-z0-9_ .-]+>|\$\{[^}]+\}|sample-only-(?:secret|client)|sample-(?:secret|client)|test-only-secret|test-(?:secret|client)|example-(?:secret|password)|dummy-(?:secret|password)|placeholder|redacted|change[_-]?me|YOUR_[A-Z_]+)$/i;
export function assertSecretFree(text: string, extraSecrets: readonly string[]): void {
  if (extraSecrets.some(secret => text.includes(secret) || text.includes(Buffer.from(secret).toString("base64")))) throw new SourceWorkspaceError("SOURCE_SECRET_DETECTED");
  const forbidden = [
    /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
    /\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|[sr]k_live_[A-Za-z0-9]{16,}|AIza[A-Za-z0-9_-]{25,}|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
    // URL userinfo cannot span a quote, comma or bracket: this also scans compact JSON, where a plain host literal would otherwise run on to a later "@scope/package".
    /\b(?:https?|postgres(?:ql)?|mysql|redis):\/\/[^\s/:"'`,{}[\]\\]+:[^\s/@"'`,{}[\]\\]+@/i,
    /\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_.=-]{16,}/i,
  ];
  if (forbidden.some(pattern => pattern.test(text))) throw new SourceWorkspaceError("SOURCE_SECRET_DETECTED");
  const assignment = /["'`]?\b([A-Za-z_][A-Za-z0-9_.-]{0,100})["'`]?\s*[:=]\s*(["'`])([^"'`\r\n]*)\2/gi;
  for (const match of text.matchAll(assignment)) {
    const key = match[1]!.replace(/[_.-]/g, "").toLowerCase();
    if (/(?:apikey|clientsecret|secretkey|password|passwd|accesstoken|refreshtoken|privatekey|authorization|secret)$/.test(key) && !allowedPlaceholder.test(match[3]!)) throw new SourceWorkspaceError("SOURCE_SECRET_DETECTED");
  }
}
export const EXECUTION_CAPABILITY = Object.freeze({
  contractVersion: "fracture.source-adapter/v1" as const, status: "static_only" as const, arbitrarySourceExecution: false as const,
  requiredGates: Object.freeze([
    "An owner authorizes the exact snapshot, adapter entrypoints and test manifest.",
    "An isolated runner proves read-only snapshot mounting, no host secrets and bounded CPU, memory and wall time.",
    "Network deny-by-default and scoped approved destinations are independently qualified.",
    "Dependency installation and declared commands receive separate explicit authority inside isolation.",
    "A smoke journey binds the adapter to actual observations before scenarios are admitted.",
    "Cancellation, process disposal, artifact integrity and source-hash fencing pass adversarial checks.",
  ]),
});
