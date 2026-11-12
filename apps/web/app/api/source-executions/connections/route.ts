import { z } from "zod";
import { api, body } from "@/lib/http";
import { SourceExecutionViews, sourceExecutionViewConnectSchema } from "../../../../../../packages/source-execution-view/src/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return api(request,async({service,session})=>new SourceExecutionViews(service.store).connection(session.id,{requestId:z.uuid().parse(new URL(request.url).searchParams.get("requestId"))}));}
export async function POST(request:Request){return api(request,async({service,session})=>{await service.store.rateLimit(`source-execution-view:${session.id}`,20);return new SourceExecutionViews(service.store).connect(session.id,await body(request,sourceExecutionViewConnectSchema));});}
