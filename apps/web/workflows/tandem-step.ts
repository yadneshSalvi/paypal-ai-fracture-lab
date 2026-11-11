import { getTandem } from '../lib/tandem';
import { processTandemJob } from '../../../packages/tandem/src/jobs';

export async function advanceTandem(jobId:string){
  'use step';
  return processTandemJob(await getTandem(),jobId);
}
