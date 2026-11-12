import { z } from "zod";
import { api } from "@/lib/http";
import { SourceExecutionViews } from "../../../../../../../packages/source-execution-view/src/store";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){return api(request,async({service,session})=>new SourceExecutionViews(service.store).connection(session.id,{id:z.uuid().parse((await context.params).id)}));}
export async function DELETE(request:Request,context:Context){return api(request,async({service,session})=>new SourceExecutionViews(service.store).cancel(session.id,z.uuid().parse((await context.params).id)));}
