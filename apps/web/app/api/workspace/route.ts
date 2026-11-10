import { api } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){return api(request,({service,session})=>service.workspace(session));}
