import { api } from "@/lib/http";
import { runReport, runReportHtml } from "../../../../../../../packages/ai/src/run-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return api(request, async ({ service, session }) => {
    const run = await service.store.run(runId, session.id);
    const evidence = (await service.store.evidence(session.id)).filter(item => item.runId === runId);
    const report = runReport(run, evidence);
    if (new URL(request.url).searchParams.get("format") === "html") return new Response(runReportHtml(report), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": `attachment; filename="fracture-${run.id}.html"`,
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
    return new Response(JSON.stringify(report, null, 2), {
      headers: { "content-type": "application/json", "content-disposition": `attachment; filename="fracture-${run.id}.json"` },
    });
  });
}
