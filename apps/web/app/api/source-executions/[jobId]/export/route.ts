import { z } from "zod";
import { api } from "@/lib/http";
import { SourceExecutionViews } from "../../../../../../../packages/source-execution-view/src/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{jobId:string}>}){return api(request,async({service,session})=>{const jobId=z.uuid().parse((await context.params).jobId),view=await new SourceExecutionViews(service.store).get(session.id,jobId);return new Response(JSON.stringify(view,null,2)+"\n",{headers:{"content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="source-execution-${jobId}.json"`,"x-content-sha256":view.contentHash}});});}
