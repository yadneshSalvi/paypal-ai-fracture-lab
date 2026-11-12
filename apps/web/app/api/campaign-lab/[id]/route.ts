import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
import { CampaignLab } from "../../../../../../packages/campaigns/src/runtime";
import { dispatchCampaign } from "@/lib/campaign-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const schema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.enum(["cancel", "resume"]), requestId: commandId }),
  z.strictObject({ action: z.literal("minimize"), caseId: z.uuid(), invariantId: z.string().regex(/^I[1-8]$/), requestId: commandId }),
]);
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session }) => new CampaignLab(service.store).store.get((await context.params).id, session.id));
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session, requestId }) => {
    const input = await body(request, schema); const id = (await context.params).id; const lab = new CampaignLab(service.store);
    await service.store.rateLimit(`campaign-command:${session.id}`, 100);
    const campaign = input.action === "minimize" ? await lab.minimize(session.id, id, input.caseId, input.invariantId, input.requestId) : await lab.store.command(session.id, id, input.action, input.requestId);
    let dispatch: "accepted" | "pending" | "not_required" = input.action === "cancel" || !["queued", "running", "waiting"].includes(campaign.status) ? "not_required" : "pending";
    if (dispatch === "pending") { try { if (await dispatchCampaign(campaign.id)) dispatch = "accepted"; } catch { /* The existing SQL operation remains recoverable. */ } }
    return Response.json({ data: { campaign, dispatch }, requestId, operationId: campaign.id, status: campaign.status }, { status: input.action === "cancel" ? 200 : 202 });
  });
}
