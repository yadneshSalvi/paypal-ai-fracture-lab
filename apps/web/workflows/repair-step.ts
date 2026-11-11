import { getService } from "@fracture/service";
import { processRepairJob } from "../../../packages/service/src/generated-repairs";
import { cancelInactiveBackgroundModels } from "../../../packages/ai/src/background";

export async function advanceRepair(jobId:string){
  "use step";
  const service=await getService();
  await cancelInactiveBackgroundModels(service.store);
  const before=(await service.store.db.query<{stage:string}&Record<string,unknown>>("SELECT stage FROM lab_repair_jobs WHERE id=$1",[jobId])).rows[0];
  if(!before)return {done:true,stage:"missing"};
  if(["completed","cancelled","failed"].includes(before.stage))return {done:true,stage:before.stage};
  const result=await processRepairJob(service.store,{jobId});
  console.info("repair.workflow.step",result?.stage??"busy");
  return {done:!!result&&["completed","cancelled","failed"].includes(result.stage),stage:result?.stage??"waiting"};
}
