import { setTimeout as delay } from "node:timers/promises";
import { getService } from "../packages/service/src/index";
import { processRepairJob } from "../packages/service/src/generated-repairs";

const service=await getService();
let stopping=false;
process.on("SIGINT",()=>{stopping=true;});process.on("SIGTERM",()=>{stopping=true;});
try {
  do {
    const result=await processRepairJob(service.store);
    if(result)process.stdout.write(JSON.stringify(result)+"\n");
    if(process.argv.includes("--once"))break;
    if(!stopping)await delay(result?.stage==="waiting"?10000:2000);
  } while(!stopping);
} finally {await service.store.db.close();}
