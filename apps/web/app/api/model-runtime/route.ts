import { api } from "@/lib/http";
import { modelRuntimeView } from "../../../../../packages/ai/src/runtime-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(request, ({ service, session }) => modelRuntimeView(service.store, session.id));
}
