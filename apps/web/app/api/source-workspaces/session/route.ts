import { z } from "zod";
import { sha256 } from "@fracture/paypal-core";
import { api, body, sessionCookie } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return api(request, async ({ service, session, requestId }) => {
    await body(request, z.strictObject({}));
    await service.store.rateLimit(`source-session:${sha256(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local")}`, 120);
    const current = session ?? await service.store.createSession();
    // A source viewer needs a browser scope, not a pre-seeded purchase experiment.
    return Response.json({ data: await service.workspace(current), requestId }, { status: session ? 200 : 201, headers: { "set-cookie": sessionCookie(current, new URL(request.url).protocol === "https:") } });
  }, { anonymous: true });
}
