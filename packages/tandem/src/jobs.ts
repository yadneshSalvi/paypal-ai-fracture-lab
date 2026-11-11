import { invokeCloudTandem } from './cloud';
import { TandemExperiments } from './experiments';
import { invokeLocalTandem } from './local';
import type { TandemInvocation } from './local';
import type { TandemStore } from './store';

export type TandemRunner=(store:TandemStore,input:TandemInvocation,onLifecycle:(proof:Record<string,unknown>)=>Promise<void>)=>Promise<Record<string,unknown>>;
export async function processTandemJob(experiments:TandemExperiments,id:string,runner:TandemRunner=async(store,input,onLifecycle)=>{
  if(process.env.TANDEM_EXECUTION_MODE==='local_fixed_source'&&process.env.VERCEL!=='1'&&!process.env.VERCEL_DEPLOYMENT_ID){
    const result=await invokeLocalTandem(store,input);
    return {...result,runner:{engine:'trusted_local_fixed_source',arbitraryCodeIsolation:false,credentialEnvironmentForwarded:false,sourceHash:(await store.run()).sourceHash}};
  }
  const snapshotId=process.env.TANDEM_RUNTIME_SNAPSHOT;
  if(!snapshotId)throw new Error('TANDEM_RUNTIME_UNCONFIGURED');
  return invokeCloudTandem(store,input,{snapshotId,onLifecycle});
}){
  const job=await experiments.claim(id);
  if(!job){const current=await experiments.job(id);return {done:!current||!['queued','running'].includes(current.stage),stage:current?.stage??'missing'};}
  try{
    const result=await runner(experiments.fencedStore(job),job.invocation,proof=>experiments.lifecycle(id,proof));
    const saved=await experiments.finish(job,result);
    return {done:true,stage:saved?'completed':'ownership_changed'};
  }catch(error){
    const message=error instanceof Error?error.message:'';
    const code=/^TANDEM_[A-Z_]+$/.test(message)?message:'TANDEM_RUNNER_UNAVAILABLE';
    // A workflow retry may revisit this job, but it never redispatches it.
    // Only a distinct, explicit customer action can start another invocation.
    await experiments.finish(job,{code,detail:'This invocation did not return a confirmed completion. Original resources and committed frames remain attached.'},true);
    return {done:true,stage:'uncertain'};
  }
}
