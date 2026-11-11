import { sleep } from 'workflow';
import { advanceTandem } from './tandem-step';

export async function executeTandemWorkflow(jobId:string){
  'use workflow';
  for(;;){const result=await advanceTandem(jobId);if(result.done)return result;await sleep('10s');}
}
