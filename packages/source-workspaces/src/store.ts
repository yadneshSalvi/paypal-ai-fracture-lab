import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import type { ImportSourceWorkspaceInput, SourceChange, SourceChangeReceipt, SourceWorkspaceConfiguration, SourceWorkspaceErrorCode, SourceWorkspaceSnapshot, SourceWorkspaceStore } from "./types";
import { SOURCE_WORKSPACE_SCHEMA, SourceWorkspaceError } from "./types";
import { assertSelectablePath, assertSecretFree, EXECUTION_CAPABILITY, portableRelativePath, sourceLimits } from "./policy";
import { assertDirectoryPath, collectSources, decodeSource, isInside, revisionHash } from "./filesystem";
import type { CollectedSources, TrustedSourceRoot } from "./filesystem";
import { inspectSources } from "./inspection";
import { deepFreeze, digest, objectHash } from "./util";

interface SnapshotOrigin { version: 1; rootId: string; relativePath: string; rootFingerprint: string }
interface ImportRecord {
  version: 1; state: "pending" | "prepared" | "complete" | "failed";
  bodyHash: string; body: { rootId: string; path: string }; createdAt: string;
  snapshotId?: string; failureCode?: SourceWorkspaceErrorCode;
}
const snapshotPattern = /^sws_[a-f0-9]{64}$/;
const hashPattern = /^[a-f0-9]{64}$/;
const rootPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const SNAPSHOT_MANIFEST_LIMIT = 64 * 1024 * 1024;
const ownerId = process.getuid?.();
const isErrno = (error: unknown, code: string) => (error as NodeJS.ErrnoException)?.code === code;
let occupiedImportSlots = 0;
const importWaiters: { resolve: () => void; reject: () => void; timer: ReturnType<typeof setTimeout> }[] = [];
async function acquireImportSlot(): Promise<() => void> {
  if (occupiedImportSlots < 2) occupiedImportSlots++;
  else {
    if (importWaiters.length >= 16) throw new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED");
    await new Promise<void>((resolveSlot, rejectSlot) => {
      const waiter = { resolve: resolveSlot, reject: () => rejectSlot(new SourceWorkspaceError("SOURCE_LIMIT_EXCEEDED")), timer: undefined as unknown as ReturnType<typeof setTimeout> };
      waiter.timer = setTimeout(() => { const index = importWaiters.indexOf(waiter); if (index >= 0) importWaiters.splice(index, 1); waiter.reject(); }, 15_000);
      importWaiters.push(waiter);
    });
  }
  return () => { const waiter = importWaiters.shift(); if (waiter) { clearTimeout(waiter.timer); waiter.resolve(); } else occupiedImportSlots--; };
}
function requireSnapshotId(value: unknown): asserts value is string { if (typeof value !== "string" || !snapshotPattern.test(value)) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_NOT_FOUND"); }
function recordIdentity(origin: SnapshotOrigin, snapshot: Pick<SourceWorkspaceSnapshot, "revisionHash" | "tools" | "graph" | "exclusions" | "execution">): string {
  return `sws_${objectHash({ origin, revisionHash: snapshot.revisionHash, tools: snapshot.tools, graph: snapshot.graph, exclusions: snapshot.exclusions, execution: snapshot.execution })}`;
}

/** A host-local private store. Authentication/tenant ownership must be enforced by its service consumer. */
export async function createSourceWorkspaceStore(configuration: SourceWorkspaceConfiguration): Promise<SourceWorkspaceStore> {
  try {
    if (!configuration || typeof configuration !== "object" || Object.keys(configuration).some(key => !["storageRoot", "allowedRoots", "limits", "pythonExecutable", "secretValues"].includes(key)) || typeof configuration.storageRoot !== "string" || !isAbsolute(configuration.storageRoot) || configuration.storageRoot.includes("\0") || !Array.isArray(configuration.allowedRoots) || configuration.allowedRoots.length < 1 || configuration.allowedRoots.length > 16) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
    const limits = sourceLimits(configuration.limits);
    const secrets = [...(configuration.secretValues ?? [])];
    if (secrets.length > 256 || secrets.some(value => typeof value !== "string" || value.length < 8 || value.length > 4096)) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
    if (configuration.pythonExecutable && (!isAbsolute(configuration.pythonExecutable) || configuration.pythonExecutable.includes("\0"))) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
    const rawStorage = resolve(configuration.storageRoot);
    await mkdir(rawStorage, { recursive: true, mode: 0o700 });
    const initialStorage = await lstat(rawStorage);
    if (initialStorage.isSymbolicLink() || !initialStorage.isDirectory() || (initialStorage.mode & 0o077) !== 0 || (ownerId !== undefined && initialStorage.uid !== ownerId)) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
    const storageRoot = await realpath(rawStorage);
    const storageIdentity = { dev: initialStorage.dev, ino: initialStorage.ino };
    const roots = new Map<string, TrustedSourceRoot>();
    for (const input of configuration.allowedRoots) {
      if (!input || typeof input.id !== "string" || !rootPattern.test(input.id) || roots.has(input.id) || typeof input.directory !== "string" || !isAbsolute(input.directory) || input.directory.includes("\0") || Object.keys(input).some(key => !["id", "directory"].includes(key))) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
      const initial = await lstat(input.directory);
      if (initial.isSymbolicLink() || !initial.isDirectory()) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
      const directory = await realpath(input.directory);
      if (isInside(directory, storageRoot)) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
      assertSecretFree(input.id, secrets);
      roots.set(input.id, { id: input.id, directory, dev: initial.dev, ino: initial.ino, fingerprint: objectHash({ directory, dev: initial.dev, ino: initial.ino }) });
    }
    const pythonExecutable = configuration.pythonExecutable ? await realpath(configuration.pythonExecutable) : undefined;
    if (pythonExecutable) {
      const stat = await lstat(pythonExecutable);
      if (!stat.isFile() || (stat.mode & 0o111) === 0 || isInside(pythonExecutable, storageRoot) || [...roots.values()].some(root => isInside(pythonExecutable, root.directory))) throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
    }

    async function privateDirectory(path: string): Promise<void> {
      const current = await assertDirectoryPath(path, storageRoot, "SOURCE_STORAGE_UNSAFE");
      const root = await lstat(storageRoot);
      if (root.dev !== storageIdentity.dev || root.ino !== storageIdentity.ino || (root.mode & 0o077) !== 0 || (ownerId !== undefined && root.uid !== ownerId)) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
      const parts = path.slice(storageRoot.length).split(sep).filter(Boolean);
      let directory = storageRoot;
      for (const part of parts) {
        directory = join(directory, part); const stat = await lstat(directory);
        if ((stat.mode & 0o077) !== 0 || (ownerId !== undefined && stat.uid !== ownerId)) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
      }
      if (!current.isDirectory()) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
    }
    async function makePrivateDirectory(path: string): Promise<void> {
      if (!isInside(path, storageRoot)) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
      await privateDirectory(storageRoot);
      await mkdir(path, { recursive: true, mode: 0o700 });
      await privateDirectory(path);
    }
    for (const name of ["snapshots", "staging", "requests", "receipts"]) await makePrivateDirectory(join(storageRoot, name));
    async function writePrivate(path: string, bytes: string | Buffer): Promise<void> {
      await privateDirectory(dirname(path));
      const handle = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { await handle.writeFile(bytes); await handle.sync(); await handle.chmod(0o400); }
      finally { await handle.close(); }
    }
    async function syncDirectory(path: string): Promise<void> {
      const handle = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await handle.sync(); } finally { await handle.close(); }
    }
    async function atomicJson(path: string, value: unknown): Promise<void> {
      const temporary = join(dirname(path), `.write-${randomUUID()}.json`);
      try { await writePrivate(temporary, JSON.stringify(value)); await rename(temporary, path); await syncDirectory(dirname(path)); }
      finally { await rm(temporary, { force: true }); }
    }
    async function readPrivate(path: string, maximum: number): Promise<Buffer> {
      await privateDirectory(dirname(path));
      let handle;
      try {
        handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const stat = await handle.stat();
        if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077) !== 0 || (ownerId !== undefined && stat.uid !== ownerId) || stat.size > maximum) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
        const buffer = Buffer.alloc(stat.size + 1); let used = 0;
        while (used < buffer.length) { const read = await handle.read(buffer, used, buffer.length - used, null); if (!read.bytesRead) break; used += read.bytesRead; }
        const after = await handle.stat();
        const current = await lstat(path);
        if (used !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs || current.isSymbolicLink() || current.dev !== stat.dev || current.ino !== stat.ino) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
        await privateDirectory(dirname(path));
        return buffer.subarray(0, used);
      } finally { await handle?.close(); }
    }
    async function readOrigin(snapshotId: string): Promise<SnapshotOrigin> {
      const parsed = JSON.parse((await readPrivate(join(storageRoot, "snapshots", snapshotId, "origin.json"), 4096)).toString("utf8")) as SnapshotOrigin;
      if (parsed.version !== 1 || !rootPattern.test(parsed.rootId) || !hashPattern.test(parsed.rootFingerprint)) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
      portableRelativePath(parsed.relativePath, 400, true); assertSelectablePath(parsed.relativePath);
      return parsed;
    }
    async function getSnapshot(snapshotId: string): Promise<SourceWorkspaceSnapshot> {
      requireSnapshotId(snapshotId);
      try {
        const directory = join(storageRoot, "snapshots", snapshotId);
        await privateDirectory(directory);
        const parsed = JSON.parse((await readPrivate(join(directory, "manifest.json"), SNAPSHOT_MANIFEST_LIMIT)).toString("utf8")) as SourceWorkspaceSnapshot;
        if (!parsed || parsed.id !== snapshotId || parsed.schemaVersion !== SOURCE_WORKSPACE_SCHEMA || !hashPattern.test(parsed.revisionHash) || !hashPattern.test(parsed.manifestHash) || !Array.isArray(parsed.files) || parsed.files.length > 4_000 || !Array.isArray(parsed.exclusions) || parsed.exclusions.length > 16_000 || !parsed.tools || !parsed.graph || !parsed.execution || typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt))) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
        const { manifestHash, ...body } = parsed;
        const origin = await readOrigin(snapshotId);
        if (objectHash(body) !== manifestHash || parsed.authorityId !== origin.rootId || recordIdentity(origin, parsed) !== snapshotId || revisionHash(parsed.files) !== parsed.revisionHash) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
        const { hash: toolsHash, ...tools } = parsed.tools;
        if (toolsHash !== objectHash(tools)) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
        const paths = new Set<string>(); let total = 0;
        for (const file of parsed.files) {
          const path = portableRelativePath(file.path, 400); assertSelectablePath(path);
          if (paths.has(path) || !hashPattern.test(file.hash) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 1024 * 1024) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
          paths.add(path); total += file.bytes;
          if (total > 48 * 1024 * 1024) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
          const bytes = await readPrivate(join(directory, "files", path), 1024 * 1024);
          if (bytes.length !== file.bytes || digest(bytes) !== file.hash) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
          assertSecretFree(decodeSource(bytes), secrets);
        }
        if (total !== parsed.totalBytes) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
        assertSecretFree(JSON.stringify(parsed), secrets);
        return deepFreeze(parsed);
      } catch (error) {
        if (isErrno(error, "ENOENT")) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_NOT_FOUND");
        if (error instanceof SourceWorkspaceError && error.code === "SOURCE_STORAGE_UNSAFE") throw error;
        throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
      }
    }
    async function collect(root: TrustedSourceRoot, path: string): Promise<CollectedSources> { return collectSources(root, path, storageRoot, limits, secrets); }
    function assertSameCollection(a: CollectedSources, b: CollectedSources): void {
      if (a.revisionHash !== b.revisionHash || objectHash(a.exclusions) !== objectHash(b.exclusions)) throw new SourceWorkspaceError("SOURCE_CHANGED_DURING_IMPORT");
    }
    async function publish(snapshot: SourceWorkspaceSnapshot, origin: SnapshotOrigin, collected: CollectedSources): Promise<SourceWorkspaceSnapshot> {
      const staging = join(storageRoot, "staging", `stage-${randomUUID()}`);
      try {
        await makePrivateDirectory(staging); await makePrivateDirectory(join(staging, "files"));
        for (const source of collected.sources) {
          const target = join(staging, "files", source.manifest.path);
          await makePrivateDirectory(dirname(target)); await writePrivate(target, Buffer.from(source.content, "utf8"));
        }
        await writePrivate(join(staging, "origin.json"), JSON.stringify(origin));
        await writePrivate(join(staging, "manifest.json"), JSON.stringify(snapshot)); await syncDirectory(staging);
        await privateDirectory(join(storageRoot, "snapshots"));
        try { await rename(staging, join(storageRoot, "snapshots", snapshot.id)); await syncDirectory(join(storageRoot, "snapshots")); }
        catch (error) { if (!isErrno(error, "EEXIST") && !isErrno(error, "ENOTEMPTY")) throw error; }
        const stored = await getSnapshot(snapshot.id);
        if (stored.revisionHash !== snapshot.revisionHash) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
        return stored;
      } finally { await rm(staging, { recursive: true, force: true }); }
    }
    const requestPath = (key: string) => join(storageRoot, "requests", `${key}.json`);
    async function readRequest(key: string): Promise<ImportRecord | undefined> {
      const path = requestPath(key);
      try { await lstat(path); }
      catch (error) { if (isErrno(error, "ENOENT")) return undefined; throw error; }
      try {
        const value = JSON.parse((await readPrivate(path, 8192)).toString("utf8")) as ImportRecord;
        if (value.version !== 1 || !["pending", "prepared", "complete", "failed"].includes(value.state) || !hashPattern.test(value.bodyHash) || !value.body || objectHash(value.body) !== value.bodyHash || !rootPattern.test(value.body.rootId) || typeof value.body.path !== "string") throw new Error();
        return value;
      } catch { throw new SourceWorkspaceError("SOURCE_IMPORT_PENDING"); }
    }
    async function replayRequest(key: string, bodyHash: string, initial: ImportRecord): Promise<SourceWorkspaceSnapshot> {
      if (initial.bodyHash !== bodyHash) throw new SourceWorkspaceError("SOURCE_IMPORT_CONFLICT");
      const deadline = Date.now() + Math.min(15_000, limits.parserTimeoutMs * 3 + 1000);
      let value = initial, delay = 25;
      while (true) {
        if (value.bodyHash !== bodyHash) throw new SourceWorkspaceError("SOURCE_IMPORT_CONFLICT");
        if (value.state === "failed") throw new SourceWorkspaceError(value.failureCode ?? "SOURCE_IMPORT_PENDING");
        if (value.state === "complete" || value.state === "prepared") {
          requireSnapshotId(value.snapshotId);
          try {
            const snapshot = await getSnapshot(value.snapshotId);
            if (value.state === "prepared") await atomicJson(requestPath(key), { ...value, state: "complete" });
            return snapshot;
          } catch (error) { if (!(error instanceof SourceWorkspaceError) || error.code !== "SOURCE_SNAPSHOT_NOT_FOUND") throw error; }
        }
        if (Date.now() >= deadline || Date.now() - Date.parse(value.createdAt) > Math.min(15_000, limits.parserTimeoutMs * 3 + 1000)) throw new SourceWorkspaceError("SOURCE_IMPORT_PENDING");
        await pause(delay); delay = Math.min(200, delay * 2);
        value = await readRequest(key) ?? value;
      }
    }
    const active = new Map<string, { bodyHash: string; promise: Promise<SourceWorkspaceSnapshot> }>();
    async function importOnce(input: ImportSourceWorkspaceInput, bodyHash: string): Promise<SourceWorkspaceSnapshot> {
      await privateDirectory(join(storageRoot, "requests"));
      const existing = await readRequest(input.requestKey);
      if (existing) return replayRequest(input.requestKey, bodyHash, existing);
      const root = roots.get(input.rootId);
      if (!root) throw new SourceWorkspaceError("SOURCE_AUTHORITY_DENIED");
      const record: ImportRecord = { version: 1, state: "pending", bodyHash, body: { rootId: input.rootId, path: input.path }, createdAt: new Date().toISOString() };
      try { await writePrivate(requestPath(input.requestKey), JSON.stringify(record)); await syncDirectory(join(storageRoot, "requests")); }
      catch (error) { if (isErrno(error, "EEXIST")) { const winning = await readRequest(input.requestKey); if (winning) return replayRequest(input.requestKey, bodyHash, winning); } throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE"); }
      let published = false;
      let releaseSlot: (() => void) | undefined;
      try {
        releaseSlot = await acquireImportSlot();
        const collected = await collect(root, input.path);
        const inspection = await inspectSources(collected.sources, limits, { cwd: storageRoot, ...(pythonExecutable ? { pythonExecutable } : {}) });
        const checked = await collect(root, input.path); assertSameCollection(collected, checked);
        const origin: SnapshotOrigin = { version: 1, rootId: root.id, relativePath: input.path, rootFingerprint: root.fingerprint };
        const data = { revisionHash: collected.revisionHash, tools: inspection.tools, graph: inspection.graph, exclusions: collected.exclusions, execution: EXECUTION_CAPABILITY };
        const base = { schemaVersion: SOURCE_WORKSPACE_SCHEMA, id: recordIdentity(origin, data), ...data, createdAt: new Date().toISOString(), authorityId: root.id, files: collected.sources.map(source => source.manifest), totalBytes: collected.totalBytes };
        assertSecretFree(JSON.stringify(base), secrets);
        const snapshot: SourceWorkspaceSnapshot = { ...base, manifestHash: objectHash(base) };
        const prepared: ImportRecord = { ...record, state: "prepared", snapshotId: snapshot.id };
        await atomicJson(requestPath(input.requestKey), prepared);
        const stored = await publish(snapshot, origin, collected); published = true;
        await atomicJson(requestPath(input.requestKey), { ...prepared, state: "complete" });
        return stored;
      } catch (error) {
        const safe = error instanceof SourceWorkspaceError ? error : new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE");
        if (!published) { try { await atomicJson(requestPath(input.requestKey), { ...record, state: "failed", failureCode: safe.code }); } catch { /* The original pending record remains recoverable; never delete or retry it. */ } }
        throw safe;
      } finally { releaseSlot?.(); }
    }
    async function importSnapshot(input: ImportSourceWorkspaceInput): Promise<SourceWorkspaceSnapshot> {
      if (!input || typeof input !== "object" || Object.keys(input).some(key => !["rootId", "path", "requestKey"].includes(key)) || typeof input.rootId !== "string" || !rootPattern.test(input.rootId) || typeof input.requestKey !== "string" || !hashPattern.test(input.requestKey)) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
      const path = portableRelativePath(input.path, limits.maxPathLength, true); assertSelectablePath(path);
      assertSecretFree(path, secrets); assertSecretFree(input.rootId, secrets); assertSecretFree(input.requestKey, secrets);
      const normalized = { rootId: input.rootId, path, requestKey: input.requestKey }, bodyHash = objectHash({ rootId: input.rootId, path });
      const prior = active.get(input.requestKey);
      if (prior) { if (prior.bodyHash !== bodyHash) throw new SourceWorkspaceError("SOURCE_IMPORT_CONFLICT"); return prior.promise; }
      const promise = importOnce(normalized, bodyHash); active.set(input.requestKey, { bodyHash, promise });
      try { return await promise; } finally { active.delete(input.requestKey); }
    }
    async function readSource(input: { snapshotId: string; path: string; expectedHash: string }): Promise<{ path: string; hash: string; content: string }> {
      if (!input || typeof input !== "object" || Object.keys(input).some(key => !["snapshotId", "path", "expectedHash"].includes(key))) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
      const path = portableRelativePath(input.path, 400); assertSelectablePath(path);
      const snapshot = await getSnapshot(input.snapshotId), manifest = snapshot.files.find(file => file.path === path);
      if (!manifest) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_NOT_FOUND");
      if (input.expectedHash !== manifest.hash) throw new SourceWorkspaceError("SOURCE_HASH_MISMATCH");
      const bytes = await readPrivate(join(storageRoot, "snapshots", snapshot.id, "files", path), 1024 * 1024);
      if (digest(bytes) !== manifest.hash) throw new SourceWorkspaceError("SOURCE_SNAPSHOT_CORRUPT");
      return deepFreeze({ path, hash: manifest.hash, content: decodeSource(bytes) });
    }
    async function checkChanges(input: { snapshotId: string }): Promise<SourceChangeReceipt> {
      if (!input || typeof input !== "object" || Object.keys(input).some(key => key !== "snapshotId")) throw new SourceWorkspaceError("SOURCE_PATH_INVALID");
      const snapshot = await getSnapshot(input.snapshotId), origin = await readOrigin(snapshot.id), root = roots.get(origin.rootId);
      if (!root || root.fingerprint !== origin.rootFingerprint) throw new SourceWorkspaceError("SOURCE_AUTHORITY_CHANGED");
      const current = await collect(root, origin.relativePath), rechecked = await collect(root, origin.relativePath); assertSameCollection(current, rechecked);
      const before = new Map(snapshot.files.map(file => [file.path, file])), after = new Map(current.sources.map(source => [source.manifest.path, source.manifest]));
      const changes: SourceChange[] = [];
      for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
        const oldFile = before.get(path), newFile = after.get(path);
        if (oldFile?.hash === newFile?.hash) continue;
        changes.push({ path, kind: !oldFile ? "added" : !newFile ? "deleted" : "modified", beforeHash: oldFile?.hash ?? null, afterHash: newFile?.hash ?? null, beforeBytes: oldFile?.bytes ?? null, afterBytes: newFile?.bytes ?? null });
      }
      const body = { schemaVersion: "fracture.source-changes/v1" as const, snapshotId: snapshot.id, baselineRevisionHash: snapshot.revisionHash, currentRevisionHash: current.revisionHash, checkedAt: new Date().toISOString(), unchanged: changes.length === 0, changes, exclusionsChanged: objectHash(snapshot.exclusions) !== objectHash(current.exclusions) };
      const receipt: SourceChangeReceipt = { ...body, receiptHash: objectHash(body) };
      assertSecretFree(JSON.stringify(receipt), secrets);
      const directory = join(storageRoot, "receipts", snapshot.id); await makePrivateDirectory(directory);
      try { await writePrivate(join(directory, `${receipt.receiptHash}.json`), JSON.stringify(receipt)); await syncDirectory(directory); }
      catch (error) { if (!isErrno(error, "EEXIST")) throw new SourceWorkspaceError("SOURCE_STORAGE_UNSAFE"); }
      return deepFreeze(receipt);
    }
    return { importSnapshot, getSnapshot, readSource, checkChanges };
  } catch (error) {
    if (error instanceof SourceWorkspaceError) throw error;
    throw new SourceWorkspaceError("SOURCE_CONFIG_INVALID");
  }
}
