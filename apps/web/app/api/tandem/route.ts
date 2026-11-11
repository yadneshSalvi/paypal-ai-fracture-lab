import { after } from 'next/server';
import { z } from 'zod';
import { api, body, commandId } from '../../../lib/http';
import { getTandem } from '../../../lib/tandem';
import { dispatchTandem } from '../../../lib/tandem-dispatch';
import { tandemScenarios } from '../../../../../packages/tandem/src/experiments';

export const runtime='nodejs';
export const maxDuration=120;
const input=z.object({scenarioId:z.enum(['lost-answer','pending','unavailable-read','lost-create','clean','reservation']),requestId:commandId}).strict();
export async function GET(request:Request){return api(request,async({session})=>({scenarios:tandemScenarios,experiments:await (await getTandem()).list(session.id)}));}
export async function POST(request:Request){return api(request,async({session,service})=>{
  const value=await body(request,input);await service.store.rateLimit(`tandem:${session.id}`,80);
  const result=await (await getTandem()).create(session.id,value.scenarioId,value.requestId,session.expiresAt);
  after(async()=>{await Promise.allSettled(result.jobs.filter(j=>j.stage==='queued').map(j=>dispatchTandem(j.id)));});
  return result;
});}
