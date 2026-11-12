import { z } from "zod";
import { api } from "@/lib/http";
import { LabError } from "@fracture/service";
import { SourceAccessStore } from "../../../../../../packages/source-access/src/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  return api(request, async ({ service, session }) => {
    const id = z.uuid().safeParse((await params).importId);
    if (!id.success) throw new LabError("SOURCE_ACCESS_DENIED", "This source snapshot is not available within the current approved scope.", 404);
    return new SourceAccessStore(service.store).get(session.id, id.data);
  });
}
