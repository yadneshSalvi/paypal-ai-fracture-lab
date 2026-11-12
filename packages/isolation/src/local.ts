import { spawn,execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { artifactPath } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import { inspectCandidate } from "./policy";
const testSchema=z.object({id:z.string(),name:z.string(),status:z.enum(["pass","fail"]),hidden:z.boolean(),durationMs:z.number().nonnegative(),detail:z.string()});
const resultSchema=z.object({schemaVersion:z.literal(1),stage:z.enum(["policy_rejected","compile_failed","evaluated"]),passed:z.boolean(),tests:z.array(testSchema),policy:z.array(z.object({id:z.string(),name:z.string(),passed:z.boolean(),reason:z.string()})),results:z.array(z.record(z.string(),z.unknown())).optional(),candidateHash:z.string().optional(),suiteHash:z.string().optional()}).passthrough();
export type IsolationResult=z.infer<typeof resultSchema>&{runnerReceipt?:Record<string,unknown>};
const dockerEnvironment=():NodeJS.ProcessEnv=>({NODE_ENV:"production",PATH:process.env.PATH??"/usr/bin:/bin",DOCKER_CONFIG:process.env.DOCKER_CONFIG??join(homedir(),".docker")});
export async function runnerIdentity(){
  let image:{imageId:string;snapshotHash:string};
  try{image=JSON.parse(await readFile(artifactPath(".artifacts/isolation/image.json"),"utf8")) as typeof image;}catch{throw new LabError("ISOLATION_NOT_READY","Prepare the local isolated runner before executing a candidate. No code was run in the web process.",503);}
  if(!/^sha256:[0-9a-f]{64}$/.test(image.imageId)||!/^[0-9a-f]{64}$/.test(image.snapshotHash))throw new LabError("ISOLATION_MANIFEST","The runner image manifest is invalid.",503);
  return image;
}
export async function runIsolatedCandidate(source:string,signal?:AbortSignal):Promise<IsolationResult>{
  if(signal?.aborted)throw new LabError("WORK_CANCELLED","The candidate job was cancelled before execution.",409);
  const policy=inspectCandidate(source);if(policy.some(check=>!check.passed))return {schemaVersion:1,stage:"policy_rejected",passed:false,policy,tests:[]};
  const {output,runnerReceipt}=await runIsolatedContainer(JSON.stringify({source}),signal);
  let result:IsolationResult;try{result=resultSchema.parse(JSON.parse(output));}catch{throw new LabError("CANDIDATE_OUTPUT_INVALID","The isolated runner did not return a valid proof record.",422);}
  return {...result,runnerReceipt};
}
/** One disposable container under the declared boundary. `command` replaces only the image's default node arguments (same image, user, limits and deadline). */
export async function runIsolatedContainer(stdin:string,signal?:AbortSignal,command?:string[]):Promise<{output:string;runnerReceipt:Record<string,unknown>}>{
  if(signal?.aborted)throw new LabError("WORK_CANCELLED","The candidate job was cancelled before execution.",409);
  const image=await runnerIdentity();
  const prefix=["--context","colima-fracture-lab"];const name=`fracture-candidate-${randomUUID()}`;const env=dockerEnvironment();let created=false;const started=Date.now();
  try{
    const id=execFileSync("docker",[...prefix,"create","--interactive","--name",name,"--network","none","--read-only","--cap-drop","ALL","--security-opt","no-new-privileges","--memory","512m","--cpus","1","--pids-limit","96","--tmpfs","/tmp:rw,nosuid,nodev,noexec,size=128m","--user","1000:1000",...(command?["--entrypoint","timeout",image.imageId,"--signal=KILL","55s","node",...command]:[image.imageId])],{env,encoding:"utf8",timeout:15000,stdio:["ignore","pipe","pipe"]}).trim();created=true;
    const inspection=JSON.parse(execFileSync("docker",[...prefix,"inspect",id],{env,encoding:"utf8",timeout:10000,stdio:["ignore","pipe","pipe"]}))[0] as {HostConfig:{NetworkMode:string;ReadonlyRootfs:boolean;Binds:string[]|null;CapDrop:string[];SecurityOpt:string[];Memory:number;PidsLimit:number;NanoCpus:number;Tmpfs:Record<string,string>};Mounts:unknown[];Image:string;Config:{User:string}};
    if(inspection.HostConfig.NetworkMode!=="none"||!inspection.HostConfig.ReadonlyRootfs||inspection.Mounts.length||inspection.HostConfig.Binds?.length||inspection.Config.User!=="1000:1000"||inspection.Image!==image.imageId||inspection.HostConfig.Memory!==536870912||inspection.HostConfig.PidsLimit!==96||inspection.HostConfig.NanoCpus!==1000000000||!inspection.HostConfig.CapDrop.includes("ALL")||!inspection.HostConfig.SecurityOpt.some(option=>option.startsWith("no-new-privileges"))||!["nosuid","nodev","noexec","size=128m"].every(option=>inspection.HostConfig.Tmpfs["/tmp"]?.split(",").includes(option)))throw new LabError("ISOLATION_CONTRACT","Container isolation did not match the declared boundary.",503);
    if(signal?.aborted)throw new LabError("WORK_CANCELLED","The candidate job was cancelled before container start.",409);
    const output=await new Promise<string>((resolve,reject)=>{
      const child=spawn("docker",[...prefix,"start","--attach","--interactive",id],{env,stdio:["pipe","pipe","pipe"]});
      let stdout="",stderr="",finished=false;
      const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener("abort",onAbort);if(error){child.kill("SIGKILL");reject(error);}else resolve(stdout);};
      const onAbort=()=>finish(new LabError("WORK_CANCELLED","The isolated candidate was cancelled; its container is removed.",409));
      const timer=setTimeout(()=>finish(new LabError("CANDIDATE_TIMEOUT","The isolated candidate exceeded its time limit.",422)),65000);
      signal?.addEventListener("abort",onAbort,{once:true});
      child.stdout.on("data",chunk=>{stdout+=String(chunk);if(Buffer.byteLength(stdout)>2000000)finish(new LabError("CANDIDATE_OUTPUT_LIMIT","The isolated candidate exceeded its output limit.",422));});
      child.stderr.on("data",chunk=>{if(stderr.length<12000)stderr+=String(chunk);});
      child.on("error",error=>finish(error));
      child.on("close",code=>finish(code===0?undefined:new LabError("CANDIDATE_RUNTIME",`The isolated runner exited with code ${code??"unknown"}. ${stderr.slice(-1500)}`,422)));
      child.stdin.on("error",()=>{});child.stdin.end(stdin);if(signal?.aborted)onAbort();
    });
    return {output,runnerReceipt:{imageId:image.imageId,snapshotHash:image.snapshotHash,containerId:id,elapsedMs:Date.now()-started,networkMode:inspection.HostConfig.NetworkMode,readOnlyRoot:inspection.HostConfig.ReadonlyRootfs,hostMountCount:inspection.Mounts.length,user:inspection.Config.User,memoryBytes:inspection.HostConfig.Memory,pidsLimit:inspection.HostConfig.PidsLimit,cpuNano:inspection.HostConfig.NanoCpus,temporaryFilesystem:inspection.HostConfig.Tmpfs["/tmp"],capabilitiesDropped:inspection.HostConfig.CapDrop,securityOptions:inspection.HostConfig.SecurityOpt,source:"sample",credentialEnvironmentForwarded:false}};
  }finally{if(created){try{execFileSync("docker",[...prefix,"rm","--force",name],{env,timeout:10000,stdio:"ignore"});}catch{/* The independent in-container supervisor also enforces the hard lifetime. */}}}
}
