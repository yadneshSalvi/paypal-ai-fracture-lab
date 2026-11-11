import { after } from 'next/server';
import { z } from 'zod';
import { api, body, commandId } from '../../../../lib/http';
import { getTandem } from '../../../../lib/tandem';
import { dispatchTandem } from '../../../../lib/tandem-dispatch';

export const runtime='nodejs';
export const maxDuration=120;
type Context={params:Promise<{id:string}>};
const command=z.object({requestId:commandId,revision:z.enum(['faulty','hardened']),action:z.enum(['retry','capture_deposit','release_remainder','refund_deposit','reconcile']),operationKey:z.string().regex(/^[A-Za-z0-9_:-]{1,100}$/).optional()}).strict();
export async function GET(request:Request,context:Context){return api(request,async({session})=>(await getTandem()).detail(session.id,(await context.params).id));}
export async function POST(request:Request,context:Context){return api(request,async({session,service})=>{
  const value=await body(request,command);await service.store.rateLimit(`tandem-command:${session.id}`,100);
  const job=await (await getTandem()).command(session.id,(await context.params).id,{requestId:value.requestId,revision:value.revision,action:value.action,...(value.operationKey?{operationKey:value.operationKey}:{})});
  after(async()=>{if(job.stage==='queued')await dispatchTandem(job.id);});return job;
});}
export async function DELETE(request:Request,context:Context){return api(request,async({session})=>(await getTandem()).cancel(session.id,(await context.params).id));}
