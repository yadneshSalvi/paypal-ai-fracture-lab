import { start, getRun } from 'workflow/api';
import { HookConflictError } from 'workflow/errors';
import { executeTandemWorkflow } from '../workflows/tandem';
import { getTandem } from './tandem';

export async function dispatchTandem(jobId:string){
  let workflowId:string;
  try{workflowId=(await start(executeTandemWorkflow,[jobId],{experimental_hook:{token:`tandem:${jobId}`,experimental_minRetention:'30 days'}})).runId;}
  catch(error){if(!HookConflictError.is(error)||!error.conflictingRunId)throw error;workflowId=error.conflictingRunId;await getRun(workflowId).wakeUp();}
  await (await getTandem()).workflow(jobId,workflowId);return workflowId;
}
