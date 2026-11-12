import { LabError } from "@fracture/service";
import { api } from "@/lib/http";
import { ToolkitInvestigations } from "../../../../../../../packages/ai/src/investigations";
import { investigationReportHtml } from "../../../../../../../packages/ai/src/investigation-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session }) => {
    const format = new URL(request.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "html") throw new LabError("REPORT_FORMAT", "Choose the JSON or HTML report.", 400);
    const report = await new ToolkitInvestigations(service.store).report(session.id, (await context.params).id);
    return new Response(format === "html" ? investigationReportHtml(report) : JSON.stringify(report, null, 2), {
      headers: {
        "content-type": format === "html" ? "text/html; charset=utf-8" : "application/json",
        "content-disposition": `attachment; filename="fracture-investigation-${report.review.id}.${format}"`,
        "x-content-sha256": report.sha256,
        "x-content-type-options": "nosniff",
      },
    });
  });
}
