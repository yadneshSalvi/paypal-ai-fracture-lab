import { getRun, start } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { getService } from "@fracture/service";
import { executeSourceExecutionWorkflow } from "../workflows/source-execution";

/** SQL owns all case identities. A lost acknowledgement reuses the same hook. */
export async function dispatchSourceExecution(jobId:string):Promise<string|null>{
  const db=(await getService()).store.db;
  const state=await db.transaction(async tx=>{
    const job=(await tx.query<{status:string}&Record<string,unknown>>("SELECT status FROM lab_source_execution_jobs_v1 WHERE id=$1 FOR UPDATE",[jobId])).rows[0];
    if(!job||!["queued","claimed","running","cancel_requested"].includes(job.status))return null;
    await tx.query("INSERT INTO lab_source_execution_dispatch_v1(job_id,version,updated_at) VALUES($1,1,$2) ON CONFLICT(job_id) DO NOTHING",[jobId,new Date().toISOString()]);
    return(await tx.query<{version:number;workflow_id:string|null}&Record<string,unknown>>("SELECT version,workflow_id FROM lab_source_execution_dispatch_v1 WHERE job_id=$1",[jobId])).rows[0]!;
  });
  if(!state)return null;
  let workflowId:string;
  try{workflowId=(await start(executeSourceExecutionWorkflow,[jobId],{experimental_hook:{token:`source-execution:${jobId}:${state.version}`,experimental_minRetention:"30 days"}})).runId;}
  catch(error){
    if(!HookConflictError.is(error)||!error.conflictingRunId)throw error;
    workflowId=error.conflictingRunId;const previous=getRun(workflowId),status=await previous.status;
    if(["completed","failed","cancelled"].includes(status)){
      // Only a checkpointed queue with no dispatched case may obtain a new
      // continuation. An uncertain claim is retained and never restarted here.
      const renewed=await db.transaction(async tx=>{
        const job=(await tx.query<{status:string}&Record<string,unknown>>("SELECT status FROM lab_source_execution_jobs_v1 WHERE id=$1 FOR UPDATE",[jobId])).rows[0];
        const inflight=(await tx.query("SELECT id FROM lab_source_execution_cases_v1 WHERE job_id=$1 AND status='dispatched'",[jobId])).rows.length;
        if(job?.status!=="queued"||inflight)return false;
        return(await tx.query("UPDATE lab_source_execution_dispatch_v1 SET version=version+1,workflow_id=NULL,updated_at=$3 WHERE job_id=$1 AND version=$2",[jobId,state.version,new Date().toISOString()])).rowCount===1;
      });
      return renewed?dispatchSourceExecution(jobId):null;
    }
    await previous.wakeUp();
  }
  await db.query("UPDATE lab_source_execution_dispatch_v1 SET workflow_id=$3,updated_at=$4 WHERE job_id=$1 AND version=$2",[jobId,state.version,workflowId,new Date().toISOString()]);
  return workflowId;
}
