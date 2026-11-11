import { timingSafeEqual } from "node:crypto";
import { getService } from "@fracture/service";
import { dispatchRepair } from "../../../../lib/repair-dispatch";
import { cancelInactiveBackgroundModels } from "../../../../../../packages/ai/src/background";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Recover the queue/start gap. The stable workflow hook prevents duplicate dispatch. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({error:"Scheduler is not configured."}, {status:503});
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({error:"Unauthorized"}, {status:401});
  const service = await getService();
  await cancelInactiveBackgroundModels(service.store);
  const jobs = await service.store.db.query<{id:string}&Record<string,unknown>>("SELECT id FROM lab_repair_jobs WHERE stage IN ('queued','running') ORDER BY created_at LIMIT 20");
  const outcomes = await Promise.allSettled(jobs.rows.map(job => dispatchRepair(job.id)));
  const failed = outcomes.filter(result => result.status === "rejected").length;
  return Response.json({examined:jobs.rowCount, dispatched:outcomes.length-failed, failed}, {status:failed ? 503 : 200, headers:{"cache-control":"no-store"}});
}
