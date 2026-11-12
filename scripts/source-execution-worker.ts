/** Explicit local owner worker. Never loads .env or falls back to the application DATABASE_URL. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PostgresDatabase, SqliteDatabase } from "@fracture/paypal-core";
import type { SqlDatabase } from "@fracture/paypal-core";
import { LabStore } from "../packages/service/src/store";
import { SourceAccessStore } from "../packages/source-access/src/store";
import { SourceExecutionService, DockerSourceExecutor, dockerRunnerIdentitySchema } from "../packages/source-execution/src/index";
function privateJson(file: string): unknown {
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||process.getuid&&stat.uid!==process.getuid()||stat.size>128000)throw new Error("Worker configuration must be a private regular file.");return JSON.parse(fs.readFileSync(file,"utf8"));
}
export async function openSourceWorkerDatabase(sqliteFile?: string): Promise<SqlDatabase> {
  if(sqliteFile){const full=path.resolve(sqliteFile);if(!path.isAbsolute(sqliteFile)||!full.includes("/.artifacts/source-execution-stage10/")||!fs.existsSync(full))throw new Error("Select an existing explicitly prepared private source-execution fixture database.");const stat=fs.lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw new Error("The source-execution fixture database must be private and regular.");return new SqliteDatabase(full);}
  const raw=process.env.FRACTURE_SOURCE_EXECUTION_DATABASE_URL,expectedDatabase=process.env.FRACTURE_SOURCE_EXECUTION_EXPECTED_DATABASE,expectedRole=process.env.FRACTURE_SOURCE_EXECUTION_EXPECTED_ROLE,expectedPort=process.env.FRACTURE_SOURCE_EXECUTION_EXPECTED_PORT;
  if(!raw||!expectedDatabase||!expectedRole||expectedPort!=="55569")throw new Error("Use a separately assigned local source-execution database/role/port. Application DATABASE_URL is never consumed.");
  const url=new URL(raw);if(!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||url.port!==expectedPort||decodeURIComponent(url.username)!==expectedRole||url.pathname!=="/"+expectedDatabase||expectedDatabase!=="fracture_source_execution_stage10"||expectedRole!=="fl_source_execution_app"||url.searchParams.get("host")!=="/tmp")throw new Error("Refuse an unassigned database, role, host or port.");
  const database=new PostgresDatabase(raw);
  try{const actual=(await database.query<{database:string;role:string}&Record<string,unknown>>("SELECT current_database() AS database,current_user AS role")).rows[0];if(actual?.database!==expectedDatabase||actual.role!==expectedRole)throw new Error("The assigned database identity did not match.");return database;}catch(error){await database.close();throw error;}
}
async function main(){const args=process.argv.slice(2),runnerFlag=args.indexOf("--runner");if(runnerFlag<0||!args[runnerFlag+1])throw new Error("Usage: source-execution-worker.ts --runner <private identity.json> [--sqlite <assigned fixture.sqlite>]. One job only; no listener.");const identity=dockerRunnerIdentitySchema.parse(privateJson(path.resolve(args[runnerFlag+1]!))),sqliteFlag=args.indexOf("--sqlite"),database=await openSourceWorkerDatabase(sqliteFlag>=0?args[sqliteFlag+1]:undefined);try{const lab=new LabStore(database),service=new SourceExecutionService(lab,new SourceAccessStore(lab),identity),job=await service.runNext("source-worker-"+randomUUID(),new DockerSourceExecutor({identity}));console.log(JSON.stringify({jobId:job?.id??null,status:job?.status??"idle",cases:job?.cases.map(item=>({id:item.id,status:item.status}))??[],sourceIncluded:false}));}finally{await database.close();}}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
