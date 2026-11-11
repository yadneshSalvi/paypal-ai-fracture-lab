import { start, getRun } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { executeRepairWorkflow } from "../workflows/repair";

export async function dispatchRepair(jobId:string){
  try{
    const run=await start(executeRepairWorkflow,[jobId],{experimental_hook:{token:`fracture:${jobId}`,experimental_minRetention:"30 days"}});
    return run.runId;
  }catch(error){if(HookConflictError.is(error)&&error.conflictingRunId){await getRun(error.conflictingRunId).wakeUp();return error.conflictingRunId;}throw error;}
}
