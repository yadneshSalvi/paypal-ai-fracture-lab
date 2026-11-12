import { api } from "@/lib/http";
import { LabError } from "@fracture/service";
import { SourceAccessStore } from "../../../../../../../packages/source-access/src/store";
import { sourceFileSchema } from "../../../../../../../packages/source-access/src/schemas";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  return api(request, async ({ service, session }) => {
    const query = new URL(request.url).searchParams;
    const parsed = sourceFileSchema.safeParse({ importId: (await params).importId, path: query.get("path"), expectedHash: query.get("hash") });
    if (!parsed.success) throw new LabError("SOURCE_FILE_INPUT_INVALID", "Read source using the exact relative path and hash from its accepted manifest.");
    return new SourceAccessStore(service.store).readFile(session.id, parsed.data.importId, parsed.data.path, parsed.data.expectedHash);
  });
}
