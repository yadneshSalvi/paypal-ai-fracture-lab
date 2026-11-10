import { api } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){return api(request,async({service})=>{await service.store.db.query("SELECT 1");return {status:"ready",database:"postgresql",runtime:"node22",sampleExecutor:true,liveExecutor:false};},{anonymous:true});}
