import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { z } from "zod";
import { LabError } from "../../../service/src/errors";

// This module deliberately has no service/config import: an editor bridge does
// not load .env, a database driver, or any provider configuration.
export const developerCredentialSchema = z.strictObject({ version: z.literal(1), id: z.uuid(), secret: z.string().regex(/^[a-f0-9]{64}$/) });
export type DeveloperCredential = z.infer<typeof developerCredentialSchema>;

export async function readPrivateDeveloperCredential(path: string): Promise<DeveloperCredential> {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 2048 || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) throw new Error("unsafe file");
    return developerCredentialSchema.parse(JSON.parse(await handle.readFile("utf8")));
  } catch {
    throw new LabError("DEVELOPER_CREDENTIAL_UNAVAILABLE", "Use npm run cli -- init to create a private developer credential; existing files must be owner-only regular files.", 401);
  } finally { await handle?.close(); }
}

/** A transport encoding of the original grant, never a new grant or session. */
export function developerBearer(credential: DeveloperCredential) {
  const parsed = developerCredentialSchema.parse(credential);
  return `fracture-v1.${parsed.id}.${parsed.secret}`;
}

export function credentialFromAuthorization(value: string | null): DeveloperCredential {
  const match = value?.match(/^Bearer fracture-v1\.([a-fA-F0-9-]{36})\.([a-f0-9]{64})$/);
  const parsed = match && developerCredentialSchema.safeParse({ version: 1, id: match[1], secret: match[2] });
  if (!parsed || !parsed.success) throw new LabError("DEVELOPER_ACCESS_DENIED", "An active private developer bearer grant is required.", 401);
  return parsed.data;
}
