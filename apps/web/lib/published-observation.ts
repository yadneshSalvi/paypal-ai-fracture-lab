import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BRAMBLE_ARCHIVE_SHA256, type PublishedObservationResult } from '../../../packages/ai/src/published-observation';
import { validatePublishedObservation } from '../../../packages/ai/src/published-observation-validation';

export function decodePublishedObservation(bytes: Uint8Array) {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== BRAMBLE_ARCHIVE_SHA256) throw new Error('The published archive fingerprint did not match.');
  return { status: 'ready' as const, record: validatePublishedObservation(JSON.parse(Buffer.from(bytes).toString('utf8'))), sha256 };
}

export async function publishedObservationBytes() {
  // Fixed public artifact only. No environment configuration, session, database or service imports.
  const relative = 'docs/evidence/live-bramble-qualification.json';
  for (const root of [process.cwd(), resolve(process.cwd(), '../..')]) {
    try { const bytes = await readFile(resolve(root, relative)); decodePublishedObservation(bytes); return bytes; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  throw new Error('The published archive is unavailable.');
}

export async function loadPublishedObservation(): Promise<PublishedObservationResult> {
  try { return decodePublishedObservation(await publishedObservationBytes()); }
  catch { return { status: 'unavailable', reason: 'The original observation archive could not be verified. No replacement history is shown.' }; }
}
