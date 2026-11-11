import { timingSafeEqual } from "node:crypto";
import { getService } from "@fracture/service";
import { dispatchRepair } from "../../../../lib/repair-dispatch";
import { cancelInactiveBackgroundModels } from "../../../../../../packages/ai/src/background";
import { getTandem } from '../../../../lib/tandem';
import { dispatchTandem } from '../../../../lib/tandem-dispatch';

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
  const tandem=await getTandem();const expired=await tandem.recoverExpired();const tandemJobs=await tandem.pending();
  const tandemOutcomes=await Promise.allSettled(tandemJobs.map(dispatchTandem));
  const failed = [...outcomes,...tandemOutcomes].filter(result => result.status === "rejected").length;
  return Response.json({examined:jobs.rowCount+tandemJobs.length, dispatched:outcomes.length+tandemOutcomes.length-failed, failed,tandemExpired:expired}, {status:failed ? 503 : 200, headers:{"cache-control":"no-store"}});
}
