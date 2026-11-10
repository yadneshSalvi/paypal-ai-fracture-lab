import { api } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{runId:string}>}){const {runId}=await params;return api(request,({service,session})=>service.store.run(runId,session.id));}
