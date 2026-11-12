import { getService } from "@fracture/service";
import { SourceAccessStore } from "../../../packages/source-access/src/store";
import { SourceExecutionService } from "../../../packages/source-execution/src/service";
import { CloudSourceExecutor, sourceCloudConfiguration } from "../../../packages/source-execution/src/cloud";

export async function advanceSourceExecution(jobId:string){
  "use step";
  const lab=(await getService()).store;
  const read=async()=> (await lab.db.query<{status:string}&Record<string,unknown>>("SELECT status FROM lab_source_execution_jobs_v1 WHERE id=$1",[jobId])).rows[0];
  const before=await read();
  if(!before)return{done:true,status:"missing"};
  const active=["queued","claimed","running","cancel_requested"];
  if(!active.includes(before.status))return{done:true,status:before.status};
  const config=sourceCloudConfiguration();
  const source=new SourceExecutionService(lab,new SourceAccessStore(lab),config.identity);
  await source.runNext("source-workflow:"+jobId,new CloudSourceExecutor(config),{jobId,maximumCases:1});
  const after=await read();
  return{done:!after||!active.includes(after.status),status:after?.status??"missing"};
}
