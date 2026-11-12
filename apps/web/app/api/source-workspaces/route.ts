import { api } from "@/lib/http";
import { LabError } from "@fracture/service";
import { SourceAccessStore } from "../../../../../packages/source-access/src/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return api(request, async ({ service, session }) => new SourceAccessStore(service.store).list(session.id)); }
export async function POST(request: Request) { return api(request, async () => { throw new LabError("SOURCE_LOCAL_IMPORT_REQUIRED", "Source imports require the authenticated local CLI and explicitly configured host roots. This browser has no filesystem or execution authority.", 403); }); }
