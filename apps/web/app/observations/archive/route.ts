import { publishedObservationBytes } from '@/lib/published-observation';
import { BRAMBLE_ARCHIVE_SHA256 } from '../../../../../packages/ai/src/published-observation';
export const dynamic = 'force-static';
export async function GET() {
  try {
    return new Response(new Uint8Array(await publishedObservationBytes()), { headers: {
      'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="bramble-observations-2026-11-11.json"',
      'X-Content-SHA256': BRAMBLE_ARCHIVE_SHA256, 'Cache-Control': 'public, max-age=3600',
    } });
  } catch { return Response.json({ error: 'The original observation archive could not be verified.' }, { status: 503 }); }
}
