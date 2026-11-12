import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
import { ToolkitInvestigations } from "../../../../../../packages/ai/src/investigations";
import { dispatchToolkitInvestigation } from "@/lib/toolkit-investigation-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const inputSchema = z.strictObject({ action: z.enum(["resume", "cancel"]), requestId: commandId });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session }) => ({ sessionId: session.id, review: await new ToolkitInvestigations(service.store).get(session.id, (await context.params).id) }));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(request, async ({ service, session, requestId }) => {
    const input = await body(request, inputSchema), id = (await context.params).id;
    const investigations = new ToolkitInvestigations(service.store);
    await service.store.rateLimit(`toolkit-command:${session.id}`, 100);
    const review = input.action === "cancel" ? await investigations.cancel(session.id, id, input.requestId) : await investigations.resume(session.id, id, input.requestId);
    let dispatch: "accepted" | "pending" | "not_required" = input.action === "cancel" || !["queued", "running"].includes(review.status) ? "not_required" : "pending";
    if (dispatch === "pending") {
      try { if (await dispatchToolkitInvestigation(review.id)) dispatch = "accepted"; }
      catch { /* Re-reading or resuming this same job can recover dispatch. */ }
    }
    return Response.json({ data: { sessionId: session.id, review, dispatch }, requestId, operationId: review.id, status: review.status }, { status: input.action === "cancel" ? 200 : 202 });
  });
}
