import { Readable, Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import { Sandbox } from "@vercel/sandbox";
import { z } from "zod";
import { sha256 } from "@fracture/paypal-core";
import { requiredConfig } from "../../service/src/config";
import { LabError } from "../../service/src/errors";
import { inspectCandidate } from "./policy";
import type { IsolationResult } from "./local";

const configSchema=z.object({snapshotId:z.string().regex(/^snap_[a-zA-Z0-9]+$/),snapshotHash:z.string().regex(/^[a-f0-9]{64}$/),suiteHash:z.string().regex(/^[a-f0-9]{64}$/)});
export interface CloudCredentials {token:string;teamId:string;projectId:string}
export function cloudRunnerIdentity(){return configSchema.parse({snapshotId:requiredConfig("FRACTURE_REPAIR_SNAPSHOT_ID"),snapshotHash:requiredConfig("FRACTURE_REPAIR_SNAPSHOT_HASH"),suiteHash:requiredConfig("FRACTURE_REPAIR_SUITE_HASH")});}
const resultSchema=z.object({schemaVersion:z.literal(1),stage:z.enum(["policy_rejected","compile_failed","evaluated"]),passed:z.boolean(),tests:z.array(z.object({id:z.string(),name:z.string(),status:z.enum(["pass","fail"]),hidden:z.boolean(),durationMs:z.number().nonnegative(),detail:z.string()})),policy:z.array(z.object({id:z.string(),name:z.string(),passed:z.boolean(),reason:z.string()})),candidateHash:z.string().optional(),suiteHash:z.string().optional()}).passthrough();

/** Credentials authenticate the trusted host SDK only; no env or network capabilities reach candidate code. */
export async function runCloudCandidate(source:string,signal?:AbortSignal,credentials?:CloudCredentials):Promise<IsolationResult>{
  if(signal?.aborted)throw new LabError("WORK_CANCELLED","The candidate job was cancelled before execution.",409);
  const policy=inspectCandidate(source);
  if(policy.some(check=>!check.passed))return {schemaVersion:1,stage:"policy_rejected",passed:false,tests:[],policy};
  const identity=cloudRunnerIdentity();
  const {output,runnerReceipt}=await runCloudSandbox(JSON.stringify({source}),signal,credentials,undefined,stdout=>{
    let proof:z.infer<typeof resultSchema>;
    try{proof=resultSchema.parse(JSON.parse(stdout));}catch{throw new LabError("CANDIDATE_OUTPUT_INVALID","The hosted runner did not return a bounded proof record.",422);}
    if(proof.stage==="evaluated"&&(proof.candidateHash!==sha256(source)||proof.suiteHash!==identity.suiteHash))throw new LabError("REPAIR_PROOF_IDENTITY","The hosted result does not bind this source and frozen suite.",422);
    return proof;
  });
  return {...output,runnerReceipt} as IsolationResult;
}
/** One nonpersistent deny-all microVM from the pinned snapshot. `script` is trusted host-authored ESM run by the same pinned node+tsx in place of the default runner entry. `accept` validates stdout before disposal is confirmed. */
export async function runCloudSandbox<T>(stdin:string,signal:AbortSignal|undefined,credentials:CloudCredentials|undefined,script:string|undefined,accept:(stdout:string)=>T):Promise<{output:T;runnerReceipt:Record<string,unknown>}>{
  if(signal?.aborted)throw new LabError("WORK_CANCELLED","The candidate job was cancelled before execution.",409);
  const identity=cloudRunnerIdentity();
  const abort=new AbortController();
  const requestSignal=AbortSignal.any([abort.signal,AbortSignal.timeout(75000),...(signal?[signal]:[])]);
  const started=Date.now();let sandbox:Sandbox|undefined;let overflow=false;let stopped=false;
  try{
    sandbox=await Sandbox.create({...credentials,name:`fracture-candidate-${randomUUID()}`,source:{type:"snapshot",snapshotId:identity.snapshotId},persistent:false,resources:{vcpus:2},timeout:70000,networkPolicy:"deny-all",tags:{project:"fracture-lab",purpose:"candidate"},signal:requestSignal});
    if(sandbox.persistent!==false||sandbox.networkPolicy!=="deny-all"||Object.keys(sandbox.mounts??{}).length)throw new LabError("ISOLATION_CONTRACT","The hosted runner did not match its credential-free network boundary.",503);
    let stdout="",stderr="";
    const output=new Writable({write(chunk,_encoding,done){stdout+=String(chunk);if(Buffer.byteLength(stdout)>2000000){overflow=true;abort.abort();done(new Error("Candidate output limit"));}else done();}});
    // Writable errors are consumed here; request cancellation and finally own process/VM disposal.
    output.on("error",()=>{});
    const errors=new Writable({write(chunk,_encoding,done){if(stderr.length<12000)stderr+=String(chunk).slice(0,12000-stderr.length);done();}});
    // The default command is byte-identical to the qualified hosted runner invocation.
    const limits="ulimit -u 96; ulimit -f 65536; exec env -i PATH=/usr/local/bin:/usr/bin:/bin NODE_ENV=production NODE_OPTIONS=--max-old-space-size=384 timeout --signal=KILL 55s node --import tsx";
    const commandStarted=Date.now();
    const result=await sandbox.asUser("candidate").runCommand({cmd:"bash",args:script?["-c",`${limits} --input-type=module -e "$1"`,"bash",script]:["-c",`${limits} packages/isolation/runner/main.ts`],cwd:"/snapshot",stdin:Readable.from([stdin]),stdout:output,stderr:errors,timeoutMs:60000,signal:requestSignal});
    if([124,137].includes(result.exitCode)&&Date.now()-commandStarted>=50000)throw new LabError("CANDIDATE_TIMEOUT","The hosted candidate reached its independent execution deadline and was stopped.",422);
    if(result.exitCode!==0)throw new LabError("CANDIDATE_RUNTIME",`The hosted isolated runner exited with code ${result.exitCode}. ${stderr.slice(-1500)}`,422);
    const proof=accept(stdout);
    const final=await sandbox.stop({signal:AbortSignal.timeout(15000)});
    stopped=final.status==="stopped"||final.status==="aborted"||final.status==="failed";
    if(!stopped)throw new LabError("CLOUD_RUNNER_CLEANUP_UNKNOWN","The candidate finished but VM disposal is not yet confirmed. No verification result was published.",503);
    return {output:{...proof,isolation:{engine:"vercel_sandbox",network:"deny-all",referenceFilesystem:"read_only",rootFilesystem:"writable_microvm",realCredentials:false,maximumSeconds:55}},runnerReceipt:{kind:"vercel_sandbox",sandboxName:sandbox.name,snapshotId:identity.snapshotId,snapshotHash:identity.snapshotHash,image:sandbox.image,nodeMajor:22,elapsedMs:Date.now()-started,networkPolicy:"deny-all",persistent:false,referenceReadOnly:true,rootReadOnly:false,hostMountCount:0,user:"candidate",vcpus:sandbox.vcpus,memoryMB:sandbox.memory,processLimit:96,maximumSeconds:55,credentialEnvironmentForwarded:false,disposalStatus:final.status,source:"sample"}};
  }catch(error){
    if(signal?.aborted)throw new LabError("WORK_CANCELLED","The hosted candidate was cancelled; no verification result was accepted.",409);
    if(overflow)throw new LabError("CANDIDATE_OUTPUT_LIMIT","The candidate exceeded its output limit and was stopped.",422);
    if(error instanceof LabError)throw error;
    throw new LabError("CLOUD_RUNNER_FAILED","The isolated hosted run could not complete. No passing result was inferred.",503);
  }finally{
    if(sandbox&&!stopped){
      try{const final=await sandbox.stop({signal:AbortSignal.timeout(15000)});stopped=["stopped","failed","aborted"].includes(final.status);}catch{/* The independent VM lifetime still bounds execution. */}
      if(!stopped)throw new LabError("CLOUD_RUNNER_CLEANUP_UNKNOWN","VM disposal could not be confirmed. The independent 70-second VM lifetime remains in force.",503);
    }
  }
}
