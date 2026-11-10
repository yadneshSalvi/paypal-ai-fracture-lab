import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const schema=z.object({projectId:z.string().max(40),revision:z.enum(["faulty","hardened"]),scenarioIds:z.array(z.string().max(12)).min(1).max(12),requestId:commandId}).strict();
export async function POST(request:Request){return api(request,async({service,session})=>{const input=await body(request,schema);await service.store.rateLimit(`campaign:${session.id}`,20);return service.campaign(session.id,input);});}
