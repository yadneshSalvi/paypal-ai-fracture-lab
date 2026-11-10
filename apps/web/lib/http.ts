import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getService, LabError } from "@fracture/service";
import type { LabService, LabSession } from "@fracture/service";
import { checkOrigin, requestSession } from "../../../packages/service/src/auth";
export { sessionCookie } from "../../../packages/service/src/auth";
export type ApiContext={service:LabService;session:LabSession;requestId:string};
export async function body<T>(request:Request,schema:z.ZodType<T>):Promise<T>{
  if(!request.headers.get("content-type")?.includes("application/json"))throw new LabError("JSON_REQUIRED","Send a JSON request body.",415);
  const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let length=0;if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>32768){await reader.cancel();throw new LabError("BODY_TOO_LARGE","The request exceeds the workspace payload limit.",413);}chunks.push(chunk.value);}}
  let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new LabError("INVALID_JSON","The request body is not valid JSON.");}const parsed=schema.safeParse(value);if(!parsed.success)throw new LabError("INVALID_REQUEST","The request does not match this action's input contract.");return parsed.data;
}
export async function api(request:Request,handler:(context:ApiContext)=>Promise<unknown>,options:{anonymous?:boolean}={}){
  const requestId=randomUUID();try{checkOrigin(request);const service=await getService();const session=await requestSession(request,service.store);if(!session&&!options.anonymous)throw new LabError("SESSION_REQUIRED","Start an isolated judge session to continue.",401);const result=await handler({service,session:session as LabSession,requestId});if(result instanceof Response){result.headers.set("cache-control","no-store");result.headers.set("x-request-id",requestId);return result;}return Response.json({data:result,requestId},{headers:{"cache-control":"no-store","x-request-id":requestId}});}catch(error){const known=error instanceof LabError;return Response.json({error:{code:known?error.code:"SERVICE_FAILURE",message:known?error.message:"The experiment service could not complete this request. Persisted observations remain available.",recoverable:known?error.recoverable:true},requestId},{status:known?error.status:503,headers:{"cache-control":"no-store","x-request-id":requestId}});}
}
export const commandId=z.string().min(8).max(100).regex(/^[a-zA-Z0-9:_-]+$/);
export const runBody=z.object({projectId:z.string().max(40),scenarioId:z.string().max(12),revision:z.enum(["faulty","hardened"]),mode:z.enum(["sample","live_sandbox","replay","modelled"]).default("sample"),seed:z.string().min(1).max(120).optional(),requestId:commandId,interactive:z.boolean().default(true)}).strict();
