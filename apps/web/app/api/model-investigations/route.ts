import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
import { ToolkitInvestigations } from "../../../../../packages/ai/src/investigations";
import { dispatchToolkitInvestigation } from "@/lib/toolkit-investigation-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const inputSchema = z.strictObject({ runId: z.uuid(), requestId: commandId });

export async function GET(request: Request) {
  return api(request, async ({ service, session }) => {
    const investigations = new ToolkitInvestigations(service.store);
    const pending = new URL(request.url).searchParams.get("requestId");
    const [reviews, runs, recovered] = await Promise.all([
      investigations.list(session.id),
      service.store.runs(session.id),
      pending && commandId.safeParse(pending).success ? investigations.findByRequest(session.id, pending) : Promise.resolve(null),
    ]);
    return {
      schemaVersion: 1,
      sessionId: session.id,
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
      model: process.env.GEMINI_MODEL ?? null,
      reviews,
      recovered,
      witnesses: runs.filter(run => run.source === "sample" && run.stage === "completed" && run.orderIds[0]).map(run => ({ id: run.id, title: run.projectName, scenario: run.scenarioTitle, sourceHash: run.sourceHash, orderId: run.orderIds[0]!, captureCount: run.captureCount, capturedMinor: run.capturedMinor, currency: run.currency })),
    };
  });
}

export async function POST(request: Request) {
  return api(request, async ({ service, session, requestId }) => {
    const input = await body(request, inputSchema);
    const review = await new ToolkitInvestigations(service.store).begin(session.id, input.runId, input.requestId);
    let dispatch: "accepted" | "pending" | "not_required" = ["queued", "running"].includes(review.status) ? "pending" : "not_required";
    if (dispatch === "pending") {
      try { if (await dispatchToolkitInvestigation(review.id)) dispatch = "accepted"; }
      catch { /* The saved SQL identity survives the queue/start acknowledgement gap. */ }
    }
    return Response.json({ data: { sessionId: session.id, review, dispatch }, requestId, operationId: review.id, status: review.status }, { status: 202 });
  });
}
