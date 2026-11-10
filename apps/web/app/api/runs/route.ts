import { api, body, runBody } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function POST(request:Request){return api(request,async({service,session})=>{const input=await body(request,runBody);await service.store.rateLimit(`run:${session.id}`,100);return service.startRun(session.id,{...input,seed:input.seed??input.requestId});});}
export async function GET(request:Request){return api(request,({service,session})=>service.store.runs(session.id));}
