import { canonicalJson, sha256 } from "@fracture/paypal-core";
import type { SqlConnection } from "@fracture/paypal-core";
import type { CampaignCaseSpec, CampaignManifest } from "../../contracts/src/campaign-lab";
import { LabError } from "../../service/src/errors";

export interface CampaignExecutionScope { campaignId: string; caseId: string; manifestHash: string }
export interface CampaignExecutionLease { owner: string; epoch: number }
export interface CampaignDocument { title: string; manifest: CampaignManifest; developerGrantId?: string }

/** The worker rechecks a private developer grant; a queued request never outlives revocation. */
export async function developerCampaignAuthority(tx: SqlConnection, sessionId: string, grantId: string): Promise<NonNullable<CampaignManifest["authorization"]>> {
  const rows = await tx.query<{ session_id: string; expires_at: string; revoked_at: string | null } & Record<string, unknown>>("SELECT session_id,expires_at,revoked_at FROM lab_developer_grants WHERE id=$1 FOR UPDATE", [grantId]);
  const row = rows.rows[0];
  const owners = await tx.query<{ role: string } & Record<string, unknown>>("SELECT role FROM lab_sessions WHERE id=$1", [sessionId]);
  if (!row || row.session_id !== sessionId || row.revoked_at || row.expires_at <= new Date().toISOString() || owners.rows[0]?.role !== "owner") throw new LabError("CAMPAIGN_AUTHORITY_REVOKED", "The original private developer grant is no longer active.", 401);
  return { kind: "developer_grant", grantIdHash: sha256(grantId), expiresAt: row.expires_at };
}

export async function assertCampaignGrant(tx: SqlConnection, sessionId: string, document: CampaignDocument) {
  const expected = document.manifest.authorization;
  if (!expected && !document.developerGrantId) return;
  if (!expected || !document.developerGrantId || expected.grantIdHash !== sha256(document.developerGrantId) || expected.expiresAt <= new Date().toISOString()) throw new LabError("CAMPAIGN_AUTHORITY_REVOKED", "The campaign's original developer authority is unavailable.", 401);
  await developerCampaignAuthority(tx, sessionId, document.developerGrantId);
}

/** Called in the same transaction as each local provider mutation. No target key is added or repaired. */
export async function assertCampaignDispatch(tx: SqlConnection, scope: CampaignExecutionScope, runId: string, sessionId: string, lease: CampaignExecutionLease): Promise<void> {
  const plans = await tx.query<{ session_id: string; status: string; expires_at: string; lease_until: string | null; lease_owner: string | null; lease_epoch: number; manifest_hash: string; document: string } & Record<string, unknown>>("SELECT session_id,status,expires_at,lease_until,lease_owner,lease_epoch,manifest_hash,document FROM lab_campaign_plans WHERE id=$1 FOR UPDATE", [scope.campaignId]);
  const plan = plans.rows[0]; const now = new Date().toISOString();
  if (!plan || plan.session_id !== sessionId || plan.status !== "running" || plan.expires_at <= now || !plan.lease_until || plan.lease_until <= now || plan.lease_owner !== lease.owner || plan.lease_epoch !== lease.epoch) throw new LabError("CAMPAIGN_AUTHORITY_REVOKED", "The saved campaign no longer permits this worker to send a new request.", 409);
  const sessions = await tx.query<{ expires_at: string } & Record<string, unknown>>("SELECT expires_at FROM lab_sessions WHERE id=$1", [sessionId]);
  if (!sessions.rows[0] || sessions.rows[0].expires_at <= now) throw new LabError("CAMPAIGN_AUTHORITY_REVOKED", "The original session authority expired.", 409);
  const document = JSON.parse(plan.document) as CampaignDocument;
  await assertCampaignGrant(tx, sessionId, document);
  const { manifest } = document;
  if (plan.manifest_hash !== scope.manifestHash || sha256(canonicalJson(manifest)) !== scope.manifestHash) throw new LabError("CAMPAIGN_BINDING_CHANGED", "The saved campaign manifest no longer matches its immutable digest.", 409);
  const cases = await tx.query<{ status: string; run_id: string; document: string } & Record<string, unknown>>("SELECT status,run_id,document FROM lab_campaign_cases_v1 WHERE id=$1 AND campaign_id=$2 AND session_id=$3", [scope.caseId, scope.campaignId, sessionId]);
  const item = cases.rows[0];
  const expected = manifest.cases.find(candidate => candidate.id === scope.caseId);
  if (!item || item.status !== "running" || item.run_id !== runId || !expected || canonicalJson(JSON.parse(item.document) as CampaignCaseSpec) !== canonicalJson(expected)) throw new LabError("CAMPAIGN_BINDING_CHANGED", "The original case identity is not available for this dispatch.", 409);
}
