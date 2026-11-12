import { join } from "node:path";
import { z } from "zod";
import { createSourceWorkspaceStore, SourceWorkspaceError } from "../../source-workspaces/src/index";
import type { SourceWorkspaceStore } from "../../source-workspaces/src/types";
import type { SourceImportInput } from "../../contracts/src/source-workspaces";
import { SourceAccessStore, MAX_SOURCE_BYTES } from "../../source-access/src/store";
import type { SourceOwner } from "../../source-access/src/store";
import { sourceRootIdSchema } from "../../source-access/src/schemas";
import { workspaceRoot } from "../../service/src/config";
import { LabError } from "../../service/src/errors";

const rootSchema = z.array(z.strictObject({ id: sourceRootIdSchema, directory: z.string().min(1).max(4096) })).min(1).max(8);
export function configuredSourceRoots() {
  const raw = process.env.FRACTURE_SOURCE_ROOTS;
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new LabError("SOURCE_HOST_CONFIGURATION", "The operator must configure explicit source root aliases on the local CLI host.", 503); }
  const roots = rootSchema.safeParse(value);
  if (!roots.success || new Set(roots.data.map(root => root.id)).size !== roots.data.length) throw new LabError("SOURCE_HOST_CONFIGURATION", "The local source root configuration is invalid.", 503);
  return roots.data;
}
export function sourceRootCapabilities() {
  return { roots: configuredSourceRoots().map(root => ({ id: root.id })), persistence: sourcePersistence(), limits: { maxFilesPerSnapshot: 1000, maxBytesPerSnapshot: MAX_SOURCE_BYTES, maxImportsPerSession: 20, maxStoredBytesPerSession: 48 * 1024 * 1024, maxChangeChecksPerSnapshot: 20 }, import: "authenticated_local_cli", staticInspection: true, applicationExecution: false, importedApplicationNetworkAccess: false, explanation: "Root directories come from trusted host configuration. Accepted sanitized source is copied into this CLI's configured database. Tool arguments can choose only an alias and a relative path. Commands in imported repositories are inventoried and never executed." };
}
export function sourcePersistence() {
  let local = false;
  try { local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(process.env.DATABASE_URL ?? "").hostname); } catch { /* Configuration errors are reported without credentials or private hostnames. */ }
  return { target: local ? "local_database" as const : "remote_or_unconfigured_database" as const, allowed: local || process.env.FRACTURE_SOURCE_REMOTE_PERSISTENCE === "1", copiesSanitizedSource: true };
}
async function localSourceStore() {
  const roots = configuredSourceRoots();
  if (!roots.length) throw new LabError("SOURCE_HOST_CONFIGURATION", "No local source roots are configured. The operator must set FRACTURE_SOURCE_ROOTS to explicit authorized root aliases before importing.", 503);
  return createSourceWorkspaceStore({ storageRoot: join(workspaceRoot(), ".local", "source-snapshots"), allowedRoots: roots, limits: { maxTotalBytes: MAX_SOURCE_BYTES, maxFiles: 1000, maxFileBytes: 512 * 1024 }, ...(process.env.FRACTURE_SOURCE_PYTHON ? { pythonExecutable: process.env.FRACTURE_SOURCE_PYTHON } : {}) });
}
function safeSourceFailure(error: unknown) {
  if (error instanceof SourceWorkspaceError) return new LabError(error.code, error.message, error.code === "SOURCE_LIMIT_EXCEEDED" ? 413 : 409);
  if (error instanceof LabError) return error;
  return new LabError("SOURCE_IMPORT_INTERRUPTED", "The source operation was interrupted. Its original request remains retained; inspect saved state before submitting new work.", 503);
}

/** Local-only entry point. The web surface never calls the filesystem importer. */
export async function importLocalSource(access: SourceAccessStore, owner: SourceOwner, input: SourceImportInput, source?: SourceWorkspaceStore) {
  if (!source && !sourcePersistence().allowed) throw new LabError("SOURCE_REMOTE_STORAGE_GATE", "Source snapshots include file contents. Use a local database, or explicitly enable FRACTURE_SOURCE_REMOTE_PERSISTENCE=1 in trusted host configuration for the configured remote database.", 403);
  const claim = await access.reserveImport(owner, input);
  if (claim.status === "ready") return access.get(owner.sessionId, claim.id);
  if (claim.status === "rejected") throw new LabError(claim.errorCode ?? "SOURCE_IMPORT_REJECTED", "The original import was rejected and its request is retained. Correct the input and use a new request UUID.", 409);
  try {
    const local = source ?? await localSourceStore();
    const snapshot = await local.importSnapshot({ rootId: input.rootId, path: input.path, requestKey: claim.requestKey });
    const files = [];
    // Reading the accepted snapshot never reopens the mutable source repository.
    for (const file of snapshot.files) files.push(await local.readSource({ snapshotId: snapshot.id, path: file.path, expectedHash: file.hash }));
    return await access.completeImport(owner, claim.id, snapshot, files);
  } catch (error) {
    const safe = safeSourceFailure(error);
    const interrupted = ["SOURCE_IMPORT_PENDING", "SOURCE_IMPORT_INTERRUPTED", "SOURCE_ACCESS_DENIED"].includes(safe.code);
    try { await access.retainImportFailure(owner, claim.id, safe.code, interrupted); } catch { /* Revocation cannot be used to rewrite the original accepted receipt. */ }
    throw safe;
  }
}

export async function checkLocalSourceChanges(access: SourceAccessStore, owner: SourceOwner, importId: string, requestId: string, source?: SourceWorkspaceStore) {
  const claim = await access.beginChanges(owner, importId, requestId);
  if (claim.receipt) return claim.receipt;
  try {
    const local = source ?? await localSourceStore();
    return await access.completeChanges(owner, claim.id, await local.checkChanges({ snapshotId: claim.snapshotId }));
  } catch (error) {
    const safe = safeSourceFailure(error);
    try { await access.retainChangeFailure(owner, claim.id, safe.code); } catch { /* Original authority cannot be renewed to rewrite a stopped observation. */ }
    throw safe;
  }
}
