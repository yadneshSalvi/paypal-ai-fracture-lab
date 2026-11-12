import { api } from "@/lib/http";
import { SourceExecutionViews } from "../../../../../packages/source-execution-view/src/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return api(request,async({service,session})=>new SourceExecutionViews(service.store).list(session.id));}
