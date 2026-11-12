import { api } from "@/lib/http";
import { CampaignLab } from "../../../../../../../packages/campaigns/src/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session }) => {
    const report = await new CampaignLab(service.store).report(session.id, (await context.params).id);
    return new Response(JSON.stringify(report, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="fracture-campaign-${report.document.campaign.id}.json"`, "x-content-sha256": report.sha256 } });
  });
}
