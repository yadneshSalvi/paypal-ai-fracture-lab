import { createHmac, timingSafeEqual } from "node:crypto";
import type { LabSession } from "./types";
import { sessionSecret } from "./config";
import { LabError } from "./errors";
import { LabStore } from "./store";
export const sessionCookieName="fracture_session";
const signature=(payload:string)=>createHmac("sha256",sessionSecret()).update(payload).digest("base64url");
export function sessionCookie(session:LabSession,secure:boolean){const payload=Buffer.from(JSON.stringify({id:session.id,exp:Date.parse(session.expiresAt)})).toString("base64url");return `${sessionCookieName}=${payload}.${signature(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure?"; Secure":""}`;}
export async function requestSession(request:Request,store:LabStore){
  const token=request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length+1);if(!token||token.length>1024)return null;
  const [payload,sig,...extra]=token.split(".");if(!payload||!sig||extra.length)return null;const expected=signature(payload);if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {id?:unknown;exp?:unknown};if(typeof data.id!=="string"||typeof data.exp!=="number"||data.exp<Date.now())return null;return await store.session(data.id);}catch{return null;}
}
export function checkOrigin(request:Request){
  if(["GET","HEAD","OPTIONS"].includes(request.method))return;
  const origin=request.headers.get("origin");if(request.headers.get("sec-fetch-site")==="cross-site"||origin&&origin!==new URL(request.url).origin)throw new LabError("ORIGIN_DENIED","This action must originate from the current workspace.",403);
}
