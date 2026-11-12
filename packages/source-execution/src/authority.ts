import type { SqlConnection } from "@fracture/paypal-core";
import type { SourceExecutionOwner, SourceAuthorityBinding, SourcePlan } from "./schemas";
import { objectHash, sha256, canonical } from "./hash";
import { executionDenied, integrityFailed } from "./errors";
type Row = Record<string, unknown>;
export type SourceAuthorityVerifier = (connection: SqlConnection, owner: SourceExecutionOwner, importId: string, expected: SourceAuthorityBinding | null, now: number) => Promise<SourceAuthorityBinding>;
/** Callers must authenticate the developer credential before constructing owner. This independently rechecks its original scope. */
export const verifySourceExecutionAuthority: SourceAuthorityVerifier = async (tx, owner, importId, expected, now) => {
  const session = (await tx.query<{ role: string; expires_at: string } & Row>("SELECT role,expires_at FROM lab_sessions WHERE id=$1 FOR UPDATE", [owner.sessionId])).rows[0];
  const grant = (await tx.query<{ session_id: string; expires_at: string; revoked_at: string | null; secret_hash: string } & Row>("SELECT session_id,expires_at,revoked_at,secret_hash FROM lab_developer_grants WHERE id=$1 FOR UPDATE", [owner.grantId])).rows[0];
  const imported = (await tx.query<{ session_id: string; grant_id: string; status: string; expires_at: string } & Row>("SELECT session_id,grant_id,status,expires_at FROM lab_source_imports WHERE id=$1", [importId])).rows[0];
  if (!session || session.role !== "owner" || !grant || grant.session_id !== owner.sessionId || grant.revoked_at || !imported || imported.session_id !== owner.sessionId || imported.grant_id !== owner.grantId || imported.status !== "ready" || [session.expires_at, grant.expires_at, imported.expires_at].some(value => !Number.isFinite(Date.parse(value)) || Date.parse(value) <= now)) throw executionDenied();
  const binding = { sessionId: owner.sessionId, grantIdHash: sha256(owner.grantId), grantSecretFingerprint: sha256(grant.secret_hash), importId, sessionExpiresAt: session.expires_at, grantExpiresAt: grant.expires_at, importExpiresAt: imported.expires_at, expiresAt: new Date(Math.min(Date.parse(session.expires_at), Date.parse(grant.expires_at), Date.parse(imported.expires_at))).toISOString() };
  if (expected && (canonical(binding) !== canonical(expected) || Date.parse(expected.expiresAt) <= now)) throw executionDenied();
  return binding;
};
export async function verifySourceImportBinding(tx: SqlConnection, plan: SourcePlan) {
  const row = (await tx.query<{ snapshot_id: string; revision_hash: string; snapshot_hash: string; snapshot_document: string } & Row>("SELECT snapshot_id,revision_hash,snapshot_hash,snapshot_document FROM lab_source_imports WHERE id=$1", [plan.importId])).rows[0];
  if (!row) throw executionDenied();
  let snapshot: { manifestHash: string; id: string; revisionHash: string };
  try { snapshot = JSON.parse(row.snapshot_document) as typeof snapshot; } catch { throw integrityFailed(); }
  const { manifestHash, ...body } = snapshot;
  if (objectHash(snapshot) !== row.snapshot_hash || objectHash(body) !== manifestHash || snapshot.id !== plan.snapshotId || row.snapshot_id !== plan.snapshotId || snapshot.revisionHash !== plan.revisionHash || row.revision_hash !== plan.revisionHash || manifestHash !== plan.sourceManifestHash) throw integrityFailed();
}
