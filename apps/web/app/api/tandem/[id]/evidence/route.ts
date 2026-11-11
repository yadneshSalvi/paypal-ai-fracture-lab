import { canonicalJson, sha256 } from '@fracture/paypal-core';
import { api } from '../../../../../lib/http';
import { getTandem } from '../../../../../lib/tandem';

export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return api(request,async({session})=>{
  const detail=await (await getTandem()).detail(session.id,(await context.params).id);
  const record={schemaVersion:1,exportedAt:new Date().toISOString(),source:'sample',externalPaymentCalls:0,description:'Actual Python SDK invocations against a controlled Sample provider. Resource history is observer evidence; hidden identifiers are not granted to the target.',...detail};
  return new Response(JSON.stringify({...record,contentSha256:sha256(canonicalJson(record))},null,2),{headers:{'content-type':'application/json','content-disposition':`attachment; filename="tandem-${detail.experiment.id}.json"`}});
});}
