import { z } from "zod";
import { api } from "@/lib/http";
import { SourceExecutionViews } from "../../../../../../packages/source-execution-view/src/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{jobId:string}>}){return api(request,async({service,session})=>new SourceExecutionViews(service.store).get(session.id,z.uuid().parse((await context.params).jobId)));}
