import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { TandemBridge, MAX_FRAME_BYTES } from './bridge';
import type { TandemStore } from './store';
import { tandemSource } from './source';
import { artifactPath } from '../../service/src/config';

export interface TandemInvocation {revision:'faulty'|'hardened';action:'checkout'|'reserve'|'operation'|'reconcile';parameters?:{key:string;kind?:'capture_authorization'|'refund'|'void';resourceId?:string;minor?:number;finalCapture?:boolean}}
/** Trusted, fixed source only. Arbitrary repair candidates require the isolated runner. */
export async function invokeLocalTandem(store:TandemStore,input:TandemInvocation,options:{killAfterFrame?:number;timeoutMs?:number}={}){
  const run=await store.run(),invocationId=randomUUID(),timeoutMs=options.timeoutMs??30000;
  if(run.sourceHash!==(await tandemSource()).sourceHash)throw new Error('TANDEM_SOURCE_CHANGED');
  const bridge=new TandemBridge(store,invocationId,Date.now()+timeoutMs);await bridge.initialize();
  const directory=artifactPath('apps/fixtures/tandem');
  return new Promise<Record<string,unknown>>((accept,reject)=>{
    const child=spawn(artifactPath('.artifacts/tandem-venv/bin/python'),['-I','-c',`import runpy,sys;sys.path.insert(0,${JSON.stringify(directory)});runpy.run_path(${JSON.stringify(resolve(directory,'worker.py'))},run_name='__main__')`],{cwd:directory,env:{PATH:process.env.PATH??'/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1',NODE_ENV:'test'},stdio:['pipe','pipe','pipe']});
    let buffer='',result:Record<string,unknown>|null=null,settled=false,frames=0,queue=Promise.resolve();
    const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){child.kill('SIGKILL');reject(error);}else if(result)accept(result);else reject(new Error('TANDEM_WORKER_EXITED_WITHOUT_RESULT'));};
    const timer=setTimeout(()=>finish(new Error('TANDEM_WORKER_DEADLINE')),timeoutMs);
    child.on('error',error=>finish(error));child.stderr.on('data',()=>{/* Never echo candidate diagnostics or raw peer input. */});
    child.stdin.on('error',()=>finish(new Error('TANDEM_INPUT_CHANNEL_UNCERTAIN')));
    child.stdout.on('data',(chunk:Buffer)=>{
      buffer+=chunk.toString('utf8');if(Buffer.byteLength(buffer)>MAX_FRAME_BYTES*2){finish(new Error('TANDEM_FRAME_LIMIT'));return;}
      let end:number;while((end=buffer.indexOf('\n'))>=0){const raw=buffer.slice(0,end+1);buffer=buffer.slice(end+1);
        queue=queue.then(async()=>{
          const parsed=JSON.parse(raw) as Record<string,unknown>;
          if(parsed.type==='complete'){if(parsed.invocationId!==invocationId||parsed.source!=='sample'||parsed.version!==1)throw new Error('TANDEM_COMPLETION_MISMATCH');result=parsed;return;}
          const reply=await bridge.handle(raw);frames++;
          if(options.killAfterFrame===frames){finish(new Error('TANDEM_CONTROLLED_WORKER_CRASH'));return;}
          if(!child.stdin.destroyed&&!settled)child.stdin.write(`${JSON.stringify(reply)}\n`);
        }).catch(error=>finish(error instanceof Error?error:new Error('TANDEM_CHANNEL_UNAVAILABLE')));
      }
    });
    child.on('close',()=>{void queue.then(()=>finish());});
    child.stdin.write(`${JSON.stringify({version:1,type:'start',invocationId,revision:input.revision,action:input.action,intent:run.intent,minor:run.minor,parameters:input.parameters??{}})}\n`);
  });
}
