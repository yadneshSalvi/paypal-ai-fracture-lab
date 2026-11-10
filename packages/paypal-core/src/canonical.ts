import { createHash } from "node:crypto";
import type { MinorMoney, PaymentAction } from "./types.js";
import { PaymentError } from "./types.js";

export function canonicalJson(value:unknown):string {
  if(value===null || typeof value==="string" || typeof value==="boolean") return JSON.stringify(value);
  if(typeof value==="number") { if(!Number.isFinite(value)) throw new PaymentError("INVALID_PAYLOAD","Non-finite values are not canonical.",400); return JSON.stringify(value); }
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if(typeof value==="object") {
    const record=value as Record<string,unknown>;
    return `{${Object.keys(record).sort().filter(k=>record[k]!==undefined).map(k=>`${JSON.stringify(k)}:${canonicalJson(record[k])}`).join(",")}}`;
  }
  throw new PaymentError("INVALID_PAYLOAD","Payload contains an unsupported value.",400);
}
export const sha256=(value:string)=>createHash("sha256").update(value).digest("hex");
export const payloadHash=(action:PaymentAction)=>sha256(canonicalJson(action));
const exponents:Record<string,number>={USD:2,EUR:2,GBP:2,INR:2,CAD:2,AUD:2,JPY:0,HUF:0,TWD:0};
export function assertMoney(money:MinorMoney):void {
  if(!(money.currency in exponents)||!Number.isSafeInteger(money.minor)||money.minor<=0) throw new PaymentError("INVALID_MONEY","Use a supported currency and positive integer minor units.",400);
}
export function toProviderMoney(money:MinorMoney):{currencyCode:string;value:string} {
  assertMoney(money);const digits=exponents[money.currency]!;
  const text=String(money.minor).padStart(digits+1,"0");
  return {currencyCode:money.currency,value:digits?`${text.slice(0,-digits)}.${text.slice(-digits)}`:text};
}
export function fromProviderMoney(money:{currencyCode:string;value:string}):MinorMoney {
  const digits=exponents[money.currencyCode];
  if(digits===undefined||!/^\d+(?:\.\d+)?$/.test(money.value)) throw new PaymentError("UNREADABLE_MONEY","Provider money cannot be represented safely.",502);
  const [whole,frac=""]=money.value.split(".");
  if(frac.length>digits&&!/^0*$/.test(frac.slice(digits))) throw new PaymentError("UNREADABLE_MONEY","Provider amount has unexpected precision.",502);
  const value=BigInt(whole!)*10n**BigInt(digits)+BigInt(frac.slice(0,digits).padEnd(digits,"0")||"0");
  if(value>BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentError("UNREADABLE_MONEY","Provider amount exceeds safe integer range.",502);
  return {currency:money.currencyCode,minor:Number(value)};
}
export function redact(value:unknown):unknown {
  if(Array.isArray(value))return value.map(redact);
  if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/authorization|cookie|secret|password|access.?token|vault.?id|email|address|payer.?name|client.?id|signature/i.test(key)?"[REDACTED]":redact(item)]));
  return value;
}
