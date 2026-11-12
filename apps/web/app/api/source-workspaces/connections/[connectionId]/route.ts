import { z } from "zod";
import { api } from "@/lib/http";
import { LabError } from "@fracture/service";
import { SourceAccessStore } from "../../../../../../../packages/source-access/src/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ connectionId: string }> };
async function id(context: Context) {
  const parsed = z.uuid().safeParse((await context.params).connectionId);
  if (!parsed.success) throw new LabError("SOURCE_ACCESS_DENIED", "This browser request is not available within the current session.", 404);
  return parsed.data;
}
export async function GET(request: Request, context: Context) { return api(request, async ({ service, session }) => new SourceAccessStore(service.store).connection(session.id, await id(context))); }
export async function DELETE(request: Request, context: Context) { return api(request, async ({ service, session }) => new SourceAccessStore(service.store).cancelConnection(session.id, await id(context))); }
