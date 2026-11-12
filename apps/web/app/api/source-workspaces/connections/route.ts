import { z } from "zod";
import { api, body } from "@/lib/http";
import { SourceAccessStore } from "../../../../../../packages/source-access/src/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return api(request, async ({ service, session }) => {
    const input = await body(request, z.strictObject({ requestId: z.uuid() }));
    await service.store.rateLimit(`source-browser:${session.id}`, 20);
    return new SourceAccessStore(service.store).connect(session.id, input.requestId);
  });
}
