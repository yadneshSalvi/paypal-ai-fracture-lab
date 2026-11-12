import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { SourceWorkspaceError } from "./types";
import type { SourceExclusion, SourceFileManifest, SourceImportLimits } from "./types";
import { assertSecretFree, exclusionForName, portableRelativePath, sourceLanguage } from "./policy";
import { digest, objectHash } from "./util";
import type { InspectedSource } from "./graph";

export interface TrustedSourceRoot { id: string; directory: string; fingerprint: string; dev: number; ino: number }
export interface CollectedSources { sources: InspectedSource[]; exclusions: SourceExclusion[]; totalBytes: number; revisionHash: string }
export const isInside = (path: string, directory: string): boolean => path === directory || (path.startsWith(directory + sep));
const sameFile = (a: Stats, b: Stats): boolean => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
const sameDirectory = (a: Stats, b: Stats): boolean => a.dev === b.dev && a.ino === b.ino && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
export async function assertDirectoryPath(directory: string, boundary: string, code: "SOURCE_AUTHORITY_CHANGED" | "SOURCE_STORAGE_UNSAFE" = "SOURCE_AUTHORITY_CHANGED"): Promise<Stats> {
  if (!isInside(directory, boundary)) throw new SourceWorkspaceError(code);
  let current = boundary;
  let result = await lstat(current);
  if (result.isSymbolicLink()) throw new SourceWorkspaceError(code === "SOURCE_STORAGE_UNSAFE" ? code : "SOURCE_SYMLINK_DENIED");
  if (!result.isDirectory()) throw new SourceWorkspaceError(code);
  const components = relative(boundary, directory).split(sep).filter(Boolean);
  for (const component of components) {
    current = join(current, component); result = await lstat(current);
    if (result.isSymbolicLink()) throw new SourceWorkspaceError(code === "SOURCE_STORAGE_UNSAFE" ? code : "SOURCE_SYMLINK_DENIED");
    if (!result.isDirectory()) throw new SourceWorkspaceError(code);
  }
  if (await realpath(directory) !== directory) throw new SourceWorkspaceError(code);
  return result;
}
export async function assertRoot(root: TrustedSourceRoot): Promise<void> {
  const stat = await assertDirectoryPath(root.directory, root.directory);
  if (stat.dev !== root.dev || stat.ino !== root.ino) throw new SourceWorkspaceError("SOURCE_AUTHORITY_CHANGED");
}
function validSourceName(name: string): void {
  if (!name || name === "." || name === ".." || !/^[A-Za-z0-9@_+ ()[\].-]+$/.test(name)) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
}
export function decodeSource(bytes: Buffer): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    if (/[\x00-\x08\x0b\x0e-\x1f\x7f]/.test(text) || !Buffer.from(text, "utf8").equals(bytes)) throw new Error();
    return text;
  } catch { throw new SourceWorkspaceError("SOURCE_ENCODING_INVALID"); }
}

/** Final-component no-follow plus ancestor/inode checks; nothing is persisted before revalidation. */
async function readSourceFile(path: string, boundary: string, initial: Stats, limit: number): Promise<Buffer> {
  await assertDirectoryPath(resolve(path, ".."), boundary);
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const before = await handle.stat();
    if (!before.isFile()) throw new SourceWorkspaceError("SOURCE_SPECIAL_FILE_DENIED");
    if (before.nlink !== 1) throw new SourceWorkspaceError("SOURCE_HARDLINK_DENIED");
    if (!sameFile(initial, before)) throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
    if (before.size > limit) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
    const chunks: Buffer[] = [];
    let length = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(64 * 1024, limit + 1 - length));
      const result = await handle.read(chunk, 0, chunk.length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
      if (length > limit) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
      chunks.push(chunk.subarray(0, result.bytesRead));
    }
    const after = await handle.stat();
    await assertDirectoryPath(resolve(path, ".."), boundary);
    const current = await lstat(path);
    if (current.isSymbolicLink()) throw new SourceWorkspaceError("SOURCE_SYMLINK_DENIED");
    if (!sameFile(initial, after) || !sameFile(initial, current) || length !== initial.size || await realpath(path) !== path) throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
    return Buffer.concat(chunks, length);
  } catch (error) {
    if (error instanceof SourceWorkspaceError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ELOOP") throw new SourceWorkspaceError("SOURCE_SYMLINK_DENIED");
    throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
  } finally { await handle?.close(); }
}

export function revisionHash(files: readonly SourceFileManifest[]): string { return objectHash({ policy: "fracture.source-policy/v1", files }); }
export async function collectSources(root: TrustedSourceRoot, selectedPath: string, storageRoot: string, limits: SourceImportLimits, secrets: readonly string[]): Promise<CollectedSources> {
  await assertRoot(root);
  const selected = selectedPath === "." ? root.directory : join(root.directory, selectedPath);
  if (!isInside(selected, root.directory) || isInside(selected, storageRoot)) throw new SourceWorkspaceError("SOURCE_AUTHORITY_DENIED");
  await assertDirectoryPath(selected, root.directory);
  const sources: InspectedSource[] = [], exclusions: SourceExclusion[] = [];
  const directories: { path: string; stat: Stats }[] = [];
  let entries = 0, totalBytes = 0;
  async function walk(directory: string, prefix: string, depth: number): Promise<void> {
    if (depth > limits.maxDepth) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
    const stat = await assertDirectoryPath(directory, root.directory);
    directories.push({ path: directory, stat });
    const names: string[] = [];
    const iterator = await opendir(directory, { bufferSize: 32 });
    for await (const entry of iterator) {
      entries++;
      if (entries > limits.maxEntries) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
      validSourceName(entry.name); names.push(entry.name);
    }
    names.sort();
    for (const name of names) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (path.length > limits.maxPathLength) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
      assertSecretFree(path, secrets);
      const absolute = join(directory, name), fileStat = await lstat(absolute);
      if (fileStat.isSymbolicLink()) throw new SourceWorkspaceError("SOURCE_SYMLINK_DENIED");
      if (!fileStat.isFile() && !fileStat.isDirectory()) throw new SourceWorkspaceError("SOURCE_SPECIAL_FILE_DENIED");
      const exclusion = absolute === storageRoot ? "private_storage" : exclusionForName(name, fileStat.isDirectory());
      if (exclusion) { exclusions.push({ path, reason: exclusion }); continue; }
      portableRelativePath(path, limits.maxPathLength);
      if (fileStat.isDirectory()) { await walk(absolute, path, depth + 1); continue; }
      if (sources.length >= limits.maxFiles || fileStat.size > limits.maxFileBytes || totalBytes + fileStat.size > limits.maxTotalBytes) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
      if (fileStat.nlink !== 1) throw new SourceWorkspaceError("SOURCE_HARDLINK_DENIED");
      const bytes = await readSourceFile(absolute, root.directory, fileStat, limits.maxFileBytes);
      const content = decodeSource(bytes); assertSecretFree(content, secrets);
      totalBytes += bytes.length;
      sources.push({ manifest: { path, hash: digest(bytes), bytes: bytes.length, language: sourceLanguage(path) }, content });
    }
  }
  try { await walk(selected, "", 0); }
  catch (error) {
    if (error instanceof SourceWorkspaceError) throw error;
    throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
  }
  await assertRoot(root);
  for (const directory of directories) {
    const after = await assertDirectoryPath(directory.path, root.directory);
    if (!sameDirectory(directory.stat, after)) throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
  }
  sources.sort((a, b) => a.manifest.path.localeCompare(b.manifest.path, "en"));
  exclusions.sort((a, b) => a.path.localeCompare(b.path, "en"));
  return { sources, exclusions, totalBytes, revisionHash: revisionHash(sources.map(source => source.manifest)) };
}
