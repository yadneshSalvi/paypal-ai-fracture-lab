import { z } from "zod";
import { sha256 } from "@fracture/paypal-core";
import { api, body, sessionCookie } from "@/lib/http";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
// {reset:true} always issues a new isolated session with freshly seeded runs; rows of the earlier session are left untouched.
export async function POST(request:Request){return api(request,async({service,session,requestId})=>{const input=await body(request,z.object({reset:z.boolean().optional()}).strict());await service.store.rateLimit(`session:${sha256(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"local")}`,120);const fresh=input.reset===true||!session;const current=fresh?await service.store.createSession():session;await service.seedSession(current);return Response.json({data:await service.workspace(current),requestId},{status:fresh?201:200,headers:{"set-cookie":sessionCookie(current,new URL(request.url).protocol==="https:")}});},{anonymous:true});}
