import { sleep } from "workflow";
import { advanceRepair } from "./repair-step";

export async function executeRepairWorkflow(jobId:string){
  "use workflow";
  for(;;){
    const result=await advanceRepair(jobId);
    if(result.done){console.info("repair.workflow.finished",result.stage);return result;}
    await sleep("10s");
  }
}
