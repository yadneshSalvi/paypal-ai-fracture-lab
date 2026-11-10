import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=240;
const schema=z.object({action:z.enum(["advance","diagnose","repair","verify","remediate","cancel","cancel_work"]),candidate:z.enum(["grounded","deceptive"]).optional(),requestId:commandId}).strict();
export async function POST(request:Request,{params}:{params:Promise<{runId:string}>}){const {runId}=await params;return api(request,async({service,session})=>{const input=await body(request,schema);await service.store.rateLimit(`action:${session.id}`,200);return service.action(session.id,runId,{action:input.action,requestId:input.requestId,...(input.candidate?{candidate:input.candidate}:{})});});}
