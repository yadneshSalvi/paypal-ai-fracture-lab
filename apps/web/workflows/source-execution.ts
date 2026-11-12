import { sleep } from "workflow";
import { advanceSourceExecution } from "./source-execution-step";

export async function executeSourceExecutionWorkflow(jobId:string){
  "use workflow";
  for(;;){
    const result=await advanceSourceExecution(jobId);
    if(result.done)return result;
    await sleep(result.status==="queued"?"1s":"10s");
  }
}
