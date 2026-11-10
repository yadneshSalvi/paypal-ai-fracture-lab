import { assertSandboxConfig } from "./provider.js";
import type { SandboxConfig } from "./provider.js";
import type { WebhookVerifier } from "./types.js";
import { PaymentError, ProviderError } from "./types.js";

/** PayPal REST postback verification; the pinned SDK does not expose webhooks. */
export class PayPalWebhookVerifier implements WebhookVerifier {
  private token:{value:string;expiresAt:number}|null=null;
  constructor(private config:SandboxConfig,private webhookId:string,private transport:typeof fetch=fetch){
    assertSandboxConfig(config);
    if(!webhookId||webhookId==="WEBHOOK_ID")throw new PaymentError("REGISTERED_WEBHOOK_REQUIRED","Postback verification requires the application's registered webhook ID.",503);
  }
  private async accessToken(){
    if(this.token&&this.token.expiresAt>Date.now()+30000)return this.token.value;
    const response=await this.transport(new Request(`${this.config.baseUrl}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",signal:AbortSignal.timeout(15000)}));
    if(!response.ok)throw new ProviderError("auth","Webhook verifier could not authenticate.","not_sent",502);
    const body=await response.json() as Record<string,unknown>;
    if(typeof body.access_token!=="string"||typeof body.expires_in!=="number")throw new ProviderError("auth","Webhook verifier received an incomplete token.","not_sent",502);
    this.token={value:body.access_token,expiresAt:Date.now()+body.expires_in*1000};return this.token.value;
  }
  async verify(rawBody:string,headers:Headers){
    const transmissionId=headers.get("paypal-transmission-id")??"missing";
    const time=headers.get("paypal-transmission-time"),cert=headers.get("paypal-cert-url"),algorithm=headers.get("paypal-auth-algo"),signature=headers.get("paypal-transmission-sig");
    if(transmissionId==="missing"||!time||!cert||!algorithm||!signature)return {verified:false,transmissionId};
    try{const url=new URL(cert);if(url.protocol!=="https:"||!["api.paypal.com","api.sandbox.paypal.com","api-m.sandbox.paypal.com"].includes(url.hostname)||!url.pathname.startsWith("/v1/notifications/certs/"))return {verified:false,transmissionId};JSON.parse(rawBody);}catch{return {verified:false,transmissionId};}
    const fields={transmission_id:transmissionId,transmission_time:time,cert_url:cert,auth_algo:algorithm,transmission_sig:signature,webhook_id:this.webhookId};
    // Preserve the exact signed event JSON instead of normalizing property order/numbers.
    const body=`${JSON.stringify(fields).slice(0,-1)},"webhook_event":${rawBody}}`;
    const response=await this.transport(new Request(`${this.config.baseUrl}/v1/notifications/verify-webhook-signature`,{method:"POST",headers:{Authorization:`Bearer ${await this.accessToken()}`,"Content-Type":"application/json"},body,signal:AbortSignal.timeout(15000)}));
    if(!response.ok)throw new ProviderError("api","Webhook verification service is unavailable; delivery remains unprocessed.","unknown",503);
    const result=await response.json() as Record<string,unknown>;
    return {verified:result.verification_status==="SUCCESS",transmissionId};
  }
}
