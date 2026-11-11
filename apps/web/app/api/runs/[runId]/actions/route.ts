import { z } from "zod";
import { api, body, commandId } from "@/lib/http";
import { dispatchRepair } from "@/lib/repair-dispatch";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=240;
const schema=z.object({action:z.enum(["advance","diagnose","repair","verify","remediate","cancel","cancel_work","generate","verify_generated"]),candidate:z.enum(["grounded","deceptive"]).optional(),repairId:z.uuid().optional(),requestId:commandId}).strict();
export async function POST(request:Request,{params}:{params:Promise<{runId:string}>}){const {runId}=await params;return api(request,async({service,session})=>{const input=await body(request,schema);await service.store.rateLimit(`action:${session.id}`,200);const result=await service.action(session.id,runId,{action:input.action,requestId:input.requestId,...(input.candidate?{candidate:input.candidate}:{}),...(input.repairId?{repairId:input.repairId}:{})});if((process.env.VERCEL==="1"||process.env.FRACTURE_DURABLE_WORKFLOW==="1")&&["generate","verify_generated"].includes(input.action))await dispatchRepair(`repair:${session.id}:${input.requestId}`);return result;});}
