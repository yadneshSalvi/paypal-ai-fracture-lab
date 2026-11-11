import { z } from 'zod';
import { sha256 } from '@fracture/paypal-core';
import { TandemProvider, type BridgeResponse } from './provider';
import { TandemRefusal, TandemStore } from './store';

export const MAX_FRAME_BYTES=196608;
const id=z.string().regex(/^[A-Za-z0-9_-]{16,80}$/);
const requestSchema=z.object({version:z.literal(1),type:z.literal('request'),invocationId:id,sequence:z.number().int().positive().max(512),requestId:z.string().max(100),channel:z.enum(['provider.exchange','operation.claim','operation.read','operation.record','authority.read','ticket.read','ticket.record','entitlement.claim']),payload:z.record(z.string(),z.unknown())}).strict();
export function strictFrame(raw:string):unknown{
  if(Buffer.byteLength(raw)>MAX_FRAME_BYTES||!raw.endsWith('\n'))throw new TandemRefusal('INVALID_FRAME_BOUND');
  const parsed:unknown=JSON.parse(raw);const stack:({object:true;keys:Set<string>;expectKey:boolean}|{object:false})[]=[];
  for(let i=0;i<raw.length;i++){
    const char=raw[i];
    if(char==='"'){
      const start=i++;for(;i<raw.length;i++){if(raw[i]==='\\'){i++;continue;}if(raw[i]==='"')break;}
      const current=stack.at(-1);if(current?.object&&current.expectKey){const key=JSON.parse(raw.slice(start,i+1)) as string;if(current.keys.has(key))throw new TandemRefusal('DUPLICATE_FRAME_KEY');current.keys.add(key);current.expectKey=false;}
    }else if(char==='{'){stack.push({object:true,keys:new Set(),expectKey:true});}
    else if(char==='['){stack.push({object:false});}
    else if(char==='}'||char===']'){stack.pop();}
    else if(char===','){const current=stack.at(-1);if(current?.object)current.expectKey=true;}
    if(stack.length>64)throw new TandemRefusal('FRAME_NESTING_LIMIT');
  }
  return parsed;
}
export class TandemBridge {
  private sequence=0;
  private broken=false;
  private inFlight=false;
  readonly provider:TandemProvider;
  constructor(readonly store:TandemStore,readonly invocationId:string,readonly expiresAt:number){id.parse(invocationId);this.provider=new TandemProvider(store);}
  async initialize(){await this.store.db.transaction(async tx=>{
    // Concurrent cold workers can race PostgreSQL's type creation despite IF NOT EXISTS.
    if(tx.dialect==='postgres')await tx.query('SELECT pg_advisory_xact_lock(174392,hashtext(current_schema()))');
    await tx.query(`CREATE TABLE IF NOT EXISTS tandem_frames(run_id text NOT NULL,invocation_id text NOT NULL,sequence integer NOT NULL,request_hash text NOT NULL,status text NOT NULL,response jsonb,PRIMARY KEY(run_id,invocation_id,sequence))`);
  });}
  async handle(raw:string):Promise<Record<string,unknown>>{
    if(this.broken||this.inFlight||Date.now()>this.expiresAt||Buffer.byteLength(raw)>MAX_FRAME_BYTES||!raw.endsWith('\n'))throw new TandemRefusal('CHANNEL_CLOSED');
    this.inFlight=true;
    try{
      const frame=requestSchema.parse(strictFrame(raw));
      if(frame.invocationId!==this.invocationId||frame.sequence!==this.sequence+1||frame.requestId!==`${this.invocationId}:${frame.sequence}`)throw new TandemRefusal('FRAME_CORRELATION_FAILED');
      this.sequence=frame.sequence;
      return await this.store.guardedFrame(async store=>{
      await store.run();
      await store.db.query('INSERT INTO tandem_frames(run_id,invocation_id,sequence,request_hash,status) VALUES($1,$2,$3,$4,$5)',[store.runId,this.invocationId,frame.sequence,sha256(raw),'dispatching']);
      let outcome:BridgeResponse;
      try{outcome=await this.dispatch(frame.channel,frame.payload,store);}
      catch(error){if(error instanceof TandemRefusal||error instanceof z.ZodError)outcome={outcome:'refused',payload:{code:error instanceof TandemRefusal?error.code:'INPUT_REFUSED'}};else throw error;}
      const reply={version:1,type:'reply',invocationId:this.invocationId,sequence:frame.sequence,requestId:frame.requestId,...outcome};
      const serialized=JSON.stringify(reply);if(Buffer.byteLength(serialized)>MAX_FRAME_BYTES)throw new TandemRefusal('REPLY_TOO_LARGE');
      await store.db.query('UPDATE tandem_frames SET status=$4,response=$5::jsonb WHERE run_id=$1 AND invocation_id=$2 AND sequence=$3',[store.runId,this.invocationId,frame.sequence,'recorded',serialized]);
      return reply;
      });
    }catch(error){this.broken=true;throw error;}finally{this.inFlight=false;}
  }
  private async dispatch(channel:string,payload:Record<string,unknown>,store:TandemStore):Promise<BridgeResponse>{
    const ok=(value:object):BridgeResponse=>({outcome:'ok',payload:value as Record<string,unknown>});
    if(channel==='provider.exchange')return new TandemProvider(store).exchange(payload);
    if(channel==='authority.read'){z.object({}).strict().parse(payload);return ok(await store.authority());}
    if(channel==='operation.claim'){const input=z.object({key:z.string(),action:z.unknown(),authorityVersion:z.number().int()}).strict().parse(payload);return ok(await store.claim(input.key,input.action,input.authorityVersion,this.invocationId));}
    if(channel==='operation.read'){const input=z.object({key:z.string()}).strict().parse(payload);return ok({operation:await store.operation(input.key)});}
    if(channel==='operation.record'){
      const input=z.discriminatedUnion('phase',[z.object({key:z.string(),phase:z.literal('dispatching')}).strict(),z.object({key:z.string(),phase:z.literal('observed'),result:z.unknown()}).strict()]).parse(payload);
      return ok(await store.record(input.key,input.phase,this.invocationId,'result'in input?input.result:undefined));
    }
    if(channel==='ticket.read'){z.object({}).strict().parse(payload);return ok((await store.run()).ticket);}
    if(channel==='ticket.record')return ok(await store.ticket(payload));
    if(channel==='entitlement.claim')return ok(await store.entitlement(payload));
    throw new TandemRefusal('CHANNEL_NOT_ALLOWED');
  }
}
