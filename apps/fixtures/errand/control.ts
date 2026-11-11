import { randomUUID } from 'node:crypto';
import { canonicalJson, sha256 } from '@fracture/paypal-core';
import type { RunDTO } from '@fracture/contracts';
import type { LocalPayPalTransport } from '../../../packages/runner/src/local-provider';
import { LabStore } from '../../../packages/service/src/store';
import { LabError } from '../../../packages/service/src/errors';
import { callErrandToolkit,errandArguments } from './toolkit';

type Operation={request_id:string;payload_hash:string;stage:string;order_id:string|null;attempts:number}&Record<string,unknown>;
export interface OrderOutcome {status:'observed'|'unknown'|'in_progress'|'not_sent'|'refused';orderId:string|null;requestId:string;dispatched:boolean;schemaHash?:string}

export async function guardedErrandOrder(store:LabStore,sessionId:string,run:RunDTO,transport:LocalPayPalTransport,retryUnknown=false,args:unknown=errandArguments):Promise<OrderOutcome>{
  if(!await store.session(sessionId))throw new LabError('SESSION_EXPIRED','This experiment session has expired.',401);
  const payloadHash=sha256(canonicalJson(args));
  const claimed=await store.db.transaction(async tx=>{
    await tx.query('SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE',[run.id,sessionId]);
    const current=await store.record(run.id,sessionId,tx);
    if(current.cancelled||current.project_id!=='errand')throw new LabError('ERRAND_AUTHORITY_DENIED','The run no longer permits this operation.',403);
    const existing=(await tx.query<Operation>('SELECT * FROM lab_errand_operations WHERE run_id=$1',[run.id])).rows[0];
    if(existing&&existing.payload_hash!==payloadHash)throw new LabError('ERRAND_PAYLOAD_CONFLICT','The purchase intent already belongs to different arguments.',409);
    if(canonicalJson(args)!==canonicalJson(errandArguments))throw new LabError('ERRAND_ARGUMENTS_DENIED','Only the frozen sample intent is allowed.',403);
    if(existing){
      if(existing.stage==='observed'||existing.stage==='refused'||existing.stage==='not_sent'||existing.stage==='dispatching'||!retryUnknown||existing.attempts>=2)return {dispatch:false,row:existing};
      await tx.query("UPDATE lab_errand_operations SET stage='dispatching',attempts=attempts+1 WHERE run_id=$1",[run.id]);
      return {dispatch:true,row:existing};
    }
    const requestId=randomUUID();
    await tx.query("INSERT INTO lab_errand_operations(run_id,request_id,payload_hash,stage,order_id,attempts) VALUES($1,$2,$3,'dispatching',NULL,1)",[run.id,requestId,payloadHash]);
    return {dispatch:true,row:{request_id:requestId,payload_hash:payloadHash,stage:'dispatching',order_id:null,attempts:1} as Operation};
  });
  const {row}=claimed;
  if(!claimed.dispatch)return {status:row.stage==='dispatching'?'in_progress':row.stage as OrderOutcome['status'],orderId:row.order_id,requestId:row.request_id,dispatched:false};
  let outcome:OrderOutcome;
  try{const result=await callErrandToolkit(transport,row.request_id,args);outcome={status:'observed',orderId:result.orderId,requestId:row.request_id,dispatched:true,schemaHash:result.schemaHash};}
  catch(error){outcome={status:error instanceof LabError&&error.code==='ERRAND_NOT_SENT'?'not_sent':error instanceof LabError&&error.code==='ERRAND_REFUSED'?'refused':'unknown',orderId:null,requestId:row.request_id,dispatched:true};}
  if(outcome.status==='not_sent')outcome.dispatched=false;
  await store.db.query('UPDATE lab_errand_operations SET stage=$2,order_id=$3 WHERE run_id=$1 AND request_id=$4',[run.id,outcome.status,outcome.orderId,row.request_id]);
  return outcome;
}

export async function unprotectedErrandOrder(transport:LocalPayPalTransport):Promise<OrderOutcome>{
  const requestId=randomUUID();
  try{const result=await callErrandToolkit(transport,requestId);return {status:'observed',orderId:result.orderId,requestId,dispatched:true,schemaHash:result.schemaHash};}
  catch(error){const notSent=error instanceof LabError&&error.code==='ERRAND_NOT_SENT';return {status:notSent?'not_sent':error instanceof LabError&&error.code==='ERRAND_REFUSED'?'refused':'unknown',orderId:null,requestId,dispatched:!notSent};}
}
