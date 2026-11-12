import { randomBytes, randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { mkdir, open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { LabError, type LabService } from "../../service/src/index";
import { workspaceRoot } from "../../service/src/config";
import { developerCredentialSchema as credentialSchema, readPrivateDeveloperCredential, type DeveloperCredential } from "./remote/credential";

export type { DeveloperCredential } from "./remote/credential";
type GrantRow = { session_id: string; secret_hash: string; expires_at: string; revoked_at: string | null } & Record<string, unknown>;
const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
export const credentialPath = () => process.env.FRACTURE_DEVELOPER_CREDENTIAL_FILE ?? join(workspaceRoot(), ".local", "developer-session.json");

export class DeveloperAccess {
  constructor(readonly service: LabService) {}
  async initialize() {
    await this.service.store.db.query(`CREATE TABLE IF NOT EXISTS lab_developer_grants(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,secret_hash TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT)`);
  }
  async create() {
    const session = await this.service.store.createSession("owner");
    const credential: DeveloperCredential = { version: 1, id: randomUUID(), secret: randomBytes(32).toString("hex") };
    await this.service.store.db.query("INSERT INTO lab_developer_grants(id,session_id,secret_hash,created_at,expires_at) VALUES($1,$2,$3,$4,$5)", [credential.id, session.id, hash(credential.secret), session.createdAt, session.expiresAt]);
    return { credential, session };
  }
  async authorize(input: unknown) {
    const parsed = credentialSchema.safeParse(input);
    if (!parsed.success) throw new LabError("DEVELOPER_ACCESS_DENIED", "The developer credential is invalid.", 401);
    const credential = parsed.data;
    const result = await this.service.store.db.query<GrantRow>("SELECT session_id,secret_hash,expires_at,revoked_at FROM lab_developer_grants WHERE id=$1", [credential.id]);
    const row = result.rows[0];
    const expected = Buffer.from(row?.secret_hash ?? "0".repeat(64), "hex");
    const valid = expected.length === 32 && timingSafeEqual(expected, Buffer.from(hash(credential.secret), "hex"));
    if (!row || !valid || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) throw new LabError("DEVELOPER_ACCESS_DENIED", "The developer grant is expired, revoked, or invalid. Initialize a new local session.", 401);
    const session = await this.service.store.session(row.session_id);
    if (!session || session.role !== "owner") throw new LabError("DEVELOPER_ACCESS_DENIED", "The developer session is no longer active.", 401);
    return session;
  }
  async revoke(credential: DeveloperCredential) {
    await this.authorize(credential);
    await this.service.store.db.query("UPDATE lab_developer_grants SET revoked_at=$2 WHERE id=$1", [credential.id, new Date().toISOString()]);
  }
}

export async function readCredential(path = credentialPath()): Promise<DeveloperCredential> {
  return readPrivateDeveloperCredential(path);
}

export async function initializeCredential(access: DeveloperAccess, path = credentialPath()) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  let handle;
  try { handle = await open(path, "wx", 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const credential = await readCredential(path);
    return { credential, session: await access.authorize(credential), created: false };
  }
  let created: Awaited<ReturnType<DeveloperAccess["create"]>> | undefined;
  try {
    created = await access.create();
    await handle.writeFile(JSON.stringify(created.credential) + "\n");
    await handle.sync();
    return { ...created, created: true };
  } catch (error) {
    if (created) await access.revoke(created.credential);
    throw error;
  } finally { await handle.close(); }
}
