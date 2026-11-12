/** Preparation only: no daemon, install, image pull, application or provider request. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { objectHash, sha256 } from "../packages/source-execution/src/hash";
import { SOURCE_ADAPTER_VERSION, SOURCE_EXECUTION_PROTOCOL, PUBLIC_SUITE_HASH, ORIGINAL_CONTRACT_HASH, SOURCE_LIMITS } from "../packages/source-execution/src/limits";
export const SOURCE_BASE_IMAGE = "sha256:c41f15f8d7b1c449cabb125b0ada5db2b9dfdcc2a2cb888bb9e23c6c1961bc65";
export const SOURCE_BASE_SNAPSHOT = "2fc3814a6c8bff4c0b034efd4ca79950564ea6143c4249cdc0884420cd01a150";
export const SOURCE_EXECUTION_BASE = "2f05b5fe409d254a596bec313f287d6e744a7ad0";
const publicDependencyHashes: Record<string, string> = { "package.json": "02478c6c9181b58777b21167a1e9cb108f7b19348b73da0f6645d26a6fc4d61a", "package-lock.json": "83b07a2ce414d452385ccd88dd55d278be016781f67265bb34a40cb5adfd95e1", "vendor/fracture-paypal-core-0.2.2.tgz": "eb23321fafb98dbf85d3eafdddd249b4c8d50010c5c44f91dd80bc817392d660" };
export function prepareSourceIsolation(root: string, publicContext: string, evidenceRoot = path.join(root, ".artifacts/source-execution-stage10")) {
  assert.equal(fs.realpathSync(root), root); const git = (...args: string[]) => execFileSync("git", args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(git("rev-parse", SOURCE_EXECUTION_BASE + "^{commit}").toString().trim(), SOURCE_EXECUTION_BASE, "The immutable accepted reference base must be present.");
  const dependencyInputs = Object.entries(publicDependencyHashes).map(([name, expected]) => { const full = path.join(publicContext, name), stat = fs.lstatSync(full); assert.ok(stat.isFile() && !stat.isSymbolicLink()); const bytes = fs.readFileSync(full); assert.equal(sha256(bytes), expected, "Public dependency context changed: " + name); return { path: name, sha256: expected, bytes: bytes.length }; });
  const gitPaths = git("ls-tree", "-r", "--name-only", SOURCE_EXECUTION_BASE, "--", "packages", "apps/fixtures", "paypal-plan.md").toString().split("\n").filter(Boolean);
  const contents = new Map<string, Buffer>();
  for (const name of gitPaths) { assert.ok(!name.includes("/node_modules/") && !name.split("/").some(part => part.startsWith("."))); contents.set(name, git("show", SOURCE_EXECUTION_BASE + ":" + name)); }
  const addNew = (directory: string) => { for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) { const name = path.posix.join(directory, entry.name); if (entry.isDirectory()) addNew(name); else { assert.ok(entry.isFile() && /\.ts$/.test(name)); contents.set(name, fs.readFileSync(path.join(root, name))); } } };
  addNew("packages/source-execution");
  contents.set("package.json", Buffer.from('{"name":"fracture-source-reference","private":true,"type":"module"}\n'));
  contents.set("tsconfig.json", Buffer.from(JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, exactOptionalPropertyTypes: true, verbatimModuleSyntax: true, esModuleInterop: true, skipLibCheck: true, noEmit: true, baseUrl: ".", paths: { "@fracture/contracts": ["packages/contracts/src/index.ts"], "@fracture/source-target": ["packages/source-execution/src/contract.ts"] } } }, null, 2) + "\n"));
  const files = [...contents].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: sha256(bytes) })).sort((a,b) => a.path.localeCompare(b.path));
  assert.equal(files.find(file => file.path === "packages/isolation/runner/suite.ts")?.sha256, PUBLIC_SUITE_HASH); assert.equal(files.find(file => file.path === "apps/fixtures/bramble/contract.ts")?.sha256, ORIGINAL_CONTRACT_HASH);
  const dependencyHash = objectHash({ baseImageId: SOURCE_BASE_IMAGE, baseSnapshotHash: SOURCE_BASE_SNAPSHOT, files: dependencyInputs });
  const adapterHash = objectHash({ version: SOURCE_ADAPTER_VERSION, originalBrambleContractHash: ORIGINAL_CONTRACT_HASH, virtualContractHash: sha256(contents.get("packages/source-execution/src/contract.ts")!), limits: SOURCE_LIMITS, externalDependencies: ["@fracture/paypal-core", "node:crypto", "type-only:@fracture/source-target", "type-only:@fracture/contracts"] });
  const runnerHash = objectHash({ protocol: SOURCE_EXECUTION_PROTOCOL, files: files.filter(file => file.path.startsWith("packages/source-execution/")), suiteHash: PUBLIC_SUITE_HASH, adapterHash, dependencyHash });
  const snapshotHash = objectHash({ sourceBase: SOURCE_EXECUTION_BASE, baseImageId: SOURCE_BASE_IMAGE, baseSnapshotHash: SOURCE_BASE_SNAPSHOT, dependencyHash, adapterHash, runnerHash, files });
  const directory = path.join(evidenceRoot, "contexts", snapshotHash); fs.mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 }); assert.ok(!fs.existsSync(directory), "Refuse an existing content-addressed context"); fs.mkdirSync(directory, { mode: 0o700 });
  const reference = path.join(directory, "reference"); fs.mkdirSync(reference, { mode: 0o700 });
  for (const [name, bytes] of contents) { const full = path.join(reference, name); fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o700 }); fs.writeFileSync(full, bytes, { flag: "wx", mode: 0o600 }); }
  const manifest = { protocol: SOURCE_EXECUTION_PROTOCOL, sourceBase: SOURCE_EXECUTION_BASE, baseImageId: SOURCE_BASE_IMAGE, baseSnapshotHash: SOURCE_BASE_SNAPSHOT, snapshotHash, runnerHash, adapterHash, dependencyHash, suiteHash: PUBLIC_SUITE_HASH, files };
  fs.writeFileSync(path.join(reference, "source-execution-context.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  for (const file of dependencyInputs) { const full = path.join(directory, "qualified-public-inputs", file.path); fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o700 }); fs.copyFileSync(path.join(publicContext, file.path), full, fs.constants.COPYFILE_EXCL); }
  const dockerfile = `FROM ${SOURCE_BASE_IMAGE}\nUSER 0:0\nCOPY reference/ /reference/\nRUN ln -s /runtime/node_modules /reference/node_modules && find /reference -type d -exec chmod 555 {} + && find /reference -type f -exec chmod 444 {} +\nWORKDIR /reference\nUSER 0:0\nENTRYPOINT ["timeout","--signal=KILL","70s","node","--import","tsx","/reference/packages/source-execution/runner/main.ts"]\n`;
  fs.writeFileSync(path.join(directory, "Dockerfile"), dockerfile, { flag: "wx", mode: 0o600 }); fs.writeFileSync(path.join(directory, ".dockerignore"), "qualified-public-inputs/\n", { flag: "wx", mode: 0o600 });
  const receipt = { ...manifest, directory, manifestHash: objectHash(manifest), dockerfileHash: sha256(dockerfile), qualifiedDependencyInputs: dependencyInputs, tag: "fracture-source:1-" + snapshotHash.slice(0, 16), boundary: { rootFilesystem: "read_only", reference: "read_only", candidateUid: 1000, supervisorUid: 0, supervisorCapabilities: ["SETUID", "SETGID"], candidateCapabilities: "none", network: "none", mounts: 0, forwardedCredentials: false }, state: "prepared_only", buildExecuted: false, pullExecuted: false, sourceExecuted: false, noOriginalImageOrContextMutation: true };
  fs.writeFileSync(path.join(directory, "preparation.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx", mode: 0o600 }); return receipt;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); if (args.length !== 2 || args[0] !== "--public-context" || !path.isAbsolute(args[1]!)) throw new Error("Usage: tsx scripts/prepare-source-isolation.ts --public-context <absolute already-qualified public context>. Preparation only; build/run are separately coordinated.");
  const root = fs.realpathSync(path.resolve(fileURLToPath(new URL("..", import.meta.url)))); const receipt = prepareSourceIsolation(root, args[1]!); console.log(JSON.stringify({ directory: receipt.directory, snapshotHash: receipt.snapshotHash, runnerHash: receipt.runnerHash, adapterHash: receipt.adapterHash, dependencyHash: receipt.dependencyHash, manifestHash: receipt.manifestHash, tag: receipt.tag, state: receipt.state }));
}
