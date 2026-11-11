import { randomUUID } from 'node:crypto';
import { Sandbox } from '@vercel/sandbox';
import { z } from 'zod';
import type { CloudCredentials } from '../../isolation/src/cloud';
import { TandemBridge, MAX_FRAME_BYTES } from './bridge';
import type { TandemInvocation } from './local';
import { tandemSource } from './source';
import type { TandemStore } from './store';

const completion=z.object({version:z.literal(1),type:z.literal('complete'),invocationId:z.string(),source:z.literal('sample'),result:z.record(z.string(),z.unknown()),requests:z.number().int().nonnegative().max(512)}).strict();
/** Parent SQL and SDK credentials remain outside the nonroot, offline Python VM. */
export async function invokeCloudTandem(store:TandemStore,input:TandemInvocation,options:{snapshotId:string;credentials?:CloudCredentials;signal?:AbortSignal;killAfterFrame?:number;onLifecycle?:(proof:Record<string,unknown>)=>Promise<void>}){
  if(!/^snap_[A-Za-z0-9]+$/.test(options.snapshotId))throw new Error('TANDEM_RUNTIME_UNCONFIGURED');
  const run=await store.run(),source=await tandemSource(),invocationId=randomUUID(),started=Date.now();
  if(run.sourceHash!==source.sourceHash)throw new Error('TANDEM_SOURCE_CHANGED');
  const signal=AbortSignal.any([AbortSignal.timeout(65000),...(options.signal?[options.signal]:[])]);
  const bridge=new TandemBridge(store,invocationId,Date.now()+60000);await bridge.initialize();
  let sandbox:Sandbox|undefined,stopped=false;
  try{
    sandbox=await Sandbox.create({...options.credentials,name:`tandem-ticket-${randomUUID()}`,source:{type:'snapshot',snapshotId:options.snapshotId},persistent:false,resources:{vcpus:2},timeout:70000,networkPolicy:'deny-all',signal});
    await options.onLifecycle?.({kind:'runtime.created',sandboxName:sandbox.name,snapshotId:options.snapshotId,sourceHash:source.sourceHash,at:new Date().toISOString()});
    if(sandbox.persistent!==false||sandbox.networkPolicy!=='deny-all'||Object.keys(sandbox.mounts??{}).length)throw new Error('TANDEM_BOUNDARY_MISMATCH');
    if((await sandbox.runCommand({cmd:'mkdir',args:['-p','/tandem'],sudo:true,signal})).exitCode!==0)throw new Error('TANDEM_DIRECTORY_FAILED');
    await sandbox.writeFiles(source.files.map(file=>({path:`/tandem/${file.name}`,content:file.content})),{signal});
    if((await sandbox.runCommand({cmd:'chmod',args:['-R','a-w','/tandem'],sudo:true,signal})).exitCode!==0)throw new Error('TANDEM_SOURCE_LOCK_FAILED');
    const command=await sandbox.asUser('candidate').runCommand({cmd:'bash',args:['-c','ulimit -u 96; ulimit -f 65536; exec env -i PATH=/usr/bin:/bin PYTHONDONTWRITEBYTECODE=1 timeout --signal=KILL 50s /runtime/venv/bin/python -u /tandem/worker.py'],cwd:'/tandem',stdin:true,detached:true,timeoutMs:55000,signal});
    await command.writeStdin(JSON.stringify({version:1,type:'start',invocationId,revision:input.revision,action:input.action,intent:run.intent,minor:run.minor,parameters:input.parameters??{}})+'\n',{abortSignal:signal});
    let buffer='',result:z.infer<typeof completion>|null=null,total=0,frames=0;
    for await(const log of command.logs({signal})){
      if(log.stream!=='stdout')throw new Error('TANDEM_WORKER_DIAGNOSTIC');
      total+=Buffer.byteLength(log.data);if(total>2_000_000)throw new Error('TANDEM_OUTPUT_LIMIT');buffer+=log.data+'\n';
      for(;;){const end=buffer.indexOf('\n');if(end<0)break;const line=buffer.slice(0,end).trim();buffer=buffer.slice(end+1);if(!line)continue;if(Buffer.byteLength(line)>MAX_FRAME_BYTES)throw new Error('TANDEM_FRAME_LIMIT');
        const parsed=JSON.parse(line) as Record<string,unknown>;
        if(parsed.type==='complete'){if(result)throw new Error('TANDEM_DUPLICATE_COMPLETION');result=completion.parse(parsed);if(result.invocationId!==invocationId||result.requests!==frames)throw new Error('TANDEM_COMPLETION_MISMATCH');continue;}
        if(result)throw new Error('TANDEM_REQUEST_AFTER_COMPLETION');
        const reply=await bridge.handle(line+'\n');frames++;
        if(options.killAfterFrame===frames)throw new Error('TANDEM_CONTROLLED_WORKER_CRASH');
        // Never retry writeStdin. A response loss after dispatch is ambiguous.
        await command.writeStdin(JSON.stringify(reply)+'\n',{abortSignal:signal});
      }
    }
    const ended=await command.wait({signal});if(ended.exitCode!==0||!result)throw new Error('TANDEM_WORKER_DID_NOT_COMPLETE');
    const disposal=await sandbox.stop({signal:AbortSignal.timeout(15000)});stopped=['stopped','failed','aborted'].includes(disposal.status);if(!stopped)throw new Error('TANDEM_DISPOSAL_UNCONFIRMED');
    await options.onLifecycle?.({kind:'runtime.disposed',sandboxName:sandbox.name,status:disposal.status,at:new Date().toISOString()});
    return {...result,runner:{engine:'vercel_sandbox',snapshotId:options.snapshotId,sourceHash:source.sourceHash,sourceHashes:source.hashes,networkPolicy:'deny-all',user:'candidate',sourceReadOnly:true,credentialEnvironmentForwarded:false,maximumSeconds:50,elapsedMs:Date.now()-started,disposal:disposal.status}};
  }finally{
    if(sandbox&&!stopped){const disposal=await sandbox.stop({signal:AbortSignal.timeout(15000)});stopped=['stopped','failed','aborted'].includes(disposal.status);await options.onLifecycle?.({kind:'runtime.disposed',sandboxName:sandbox.name,status:disposal.status,at:new Date().toISOString()});if(!stopped)throw new Error('TANDEM_DISPOSAL_UNCONFIRMED');}
  }
}
