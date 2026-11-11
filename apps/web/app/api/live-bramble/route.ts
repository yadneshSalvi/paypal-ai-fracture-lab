import {z} from 'zod';
import {ProviderError} from '@fracture/paypal-core';
import {api,body,commandId} from '@/lib/http';
import {LabError} from '@fracture/service';
import {liveBramble,liveBrambleEnabled} from '../../../../../packages/service/src/live-runtime';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('start'),requestId:commandId,revision:z.enum(['faulty','hardened']),scenarioId:z.enum(['L1','L2'])}).strict(),
 z.object({action:z.literal('create_order'),runId:z.uuid(),attempt:z.union([z.literal(1),z.literal(2)])}).strict(),
 z.object({action:z.literal('capture'),runId:z.uuid(),orderId:z.string().regex(/^[A-Za-z0-9_-]{3,128}$/)}).strict(),
 z.object({action:z.literal('reconcile'),runId:z.uuid()}).strict(),
 z.object({action:z.literal('approval_link'),runId:z.uuid(),attempt:z.union([z.literal(1),z.literal(2)])}).strict(),
 z.object({action:z.literal('compensate'),runId:z.uuid(),captureId:z.string().regex(/^[A-Za-z0-9_-]{3,128}$/)}).strict(),
]);
export async function GET(request:Request){return api(request,async({service,session})=>{
 const runId=new URL(request.url).searchParams.get('runId');if(runId){if(!z.uuid().safeParse(runId).success)throw new LabError('INVALID_RUN','Select a valid experiment.',400);return liveBramble(service.store,true).view(session.id,runId);}
 return {enabled:liveBrambleEnabled(),clientId:liveBrambleEnabled()?process.env.PAYPAL_CLIENT_ID??null:null,source:'live_sandbox',maxCaptures:6,maxGrossMinor:7200,currency:'USD',cases:['L1','L2']};
});}
export async function POST(request:Request){return api(request,async({service,session})=>{
 const input=await body(request,schema);const runner=liveBramble(service.store,input.action==='reconcile');await service.store.rateLimit(`live-request:${session.id}`,120);
 try{if(input.action==='start')return runner.start(session.id,{...input,seed:input.requestId});if(input.action==='create_order')return await runner.createOrder(session.id,input.runId,input.attempt,new URL(request.url).origin);if(input.action==='approval_link')return await runner.approvalLink(session.id,input.runId,input.attempt,new URL(request.url).origin);if(input.action==='reconcile')return await runner.reconcile(session.id,input.runId);if(input.action==='compensate')return await runner.compensate(session.id,input.runId,input.captureId);return await runner.capture(session.id,input.runId,input.orderId);}
 catch(error){if(error instanceof ProviderError)throw new LabError('PROVIDER_REVIEW',error.message,error.httpStatus===202?409:error.httpStatus);throw error;}
});}
