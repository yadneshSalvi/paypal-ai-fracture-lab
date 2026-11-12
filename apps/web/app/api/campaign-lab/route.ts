import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
import { CampaignLab } from "../../../../../packages/campaigns/src/runtime";
import { dispatchCampaign } from "@/lib/campaign-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const schema = z.strictObject({ projectId: z.literal("bramble"), scenarioIds: z.array(z.enum(["S0", "S3", "S4", "S5", "S10", "A4"])).min(1).max(6), revisions: z.array(z.enum(["faulty", "hardened"])).min(1).max(2), seed: z.string().min(1).max(100).regex(/^[a-zA-Z0-9:_-]+$/), requestId: commandId });

export async function GET(request: Request) { return api(request, async ({ service, session }) => ({ campaigns: await new CampaignLab(service.store).store.list(session.id) })); }
export async function POST(request: Request) {
  return api(request, async ({ service, session, requestId }) => {
    const input = await body(request, schema);
    await service.store.rateLimit(`campaign-lab:${session.id}`, 20);
    const campaign = await new CampaignLab(service.store).create(session.id, input);
    let dispatch: "accepted" | "pending" | "not_required" = ["queued", "running", "waiting"].includes(campaign.status) ? "pending" : "not_required";
    if (dispatch === "pending") { try { if (await dispatchCampaign(campaign.id)) dispatch = "accepted"; } catch { /* SQL queue persists; cron and the same request identity recover this gap. */ } }
    return Response.json({ data: { campaign, dispatch }, requestId, operationId: campaign.id, status: campaign.status }, { status: 202 });
  });
}
