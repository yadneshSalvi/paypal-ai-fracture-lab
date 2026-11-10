import { randomUUID } from "node:crypto";
import { mkdtemp,readdir,mkdir,copyFile,chmod,readFile,writeFile,symlink } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { SqliteDatabase,sha256 } from "@fracture/paypal-core";
import type { RunDTO,ProjectDTO,ScenarioDTO } from "@fracture/contracts";
import type { BrambleContext } from "../../../apps/fixtures/bramble/contract";
import { initializeDatabase } from "../../service/src/database";
import { LabStore } from "../../service/src/store";
import { newRun,refreshRun } from "../../service/src/executor";
import { LocalPayPalTransport } from "../../runner/src/local-provider";
import { noFaults } from "../../service/src/types";
import type { FaultPlan,RunInput } from "../../service/src/types";
import { inspectCandidate } from "../src/policy";
import { targetCapabilities } from "../src/capabilities";

interface Case {id:string;name:string;faults:Partial<FaultPlan>;calls:number;expected:{captures:number;fulfillments:number;phone?:string};concurrent?:boolean;revoked?:boolean;changedAmount?:boolean;requireIdentity?:boolean}
export const cases:Case[]=[
  {id:"happy",name:"Original happy-path purchase",faults:{},calls:1,expected:{captures:1,fulfillments:1,phone:"paid"}},
  {id:"lost",name:"Lost capture answer and repeated purchase intent",faults:{dropCaptureResponse:true},calls:2,expected:{captures:1,fulfillments:1,phone:"paid"},requireIdentity:true},
  {id:"malformed",name:"Malformed committed success",faults:{malformedSuccess:true},calls:2,expected:{captures:1,fulfillments:1,phone:"paid"},requireIdentity:true},
  {id:"unavailable",name:"Unavailable reconciliation stays uncertain",faults:{dropCaptureResponse:true,unavailableReread:true},calls:2,expected:{captures:1,fulfillments:0,phone:"checking"},requireIdentity:true},
  {id:"pending",name:"Pending capture never backs a download",faults:{capturePending:true},calls:2,expected:{captures:0,fulfillments:0,phone:"checking"}},
  {id:"auth",name:"Never-sent authentication has no payment effect",faults:{authFailure:true},calls:1,expected:{captures:0,fulfillments:0,phone:"failed"}},
  {id:"concurrent",name:"Eight concurrent callbacks share one purchase",faults:{},calls:8,concurrent:true,expected:{captures:1,fulfillments:1,phone:"paid"},requireIdentity:true},
  {id:"revoked",name:"Revoked current authority blocks dispatch",faults:{},calls:1,revoked:true,expected:{captures:0,fulfillments:0}},
  {id:"payload",name:"Changed amount cannot reuse an approved identity",faults:{},calls:2,changedAmount:true,expected:{captures:1,fulfillments:1},requireIdentity:true}
];
async function copySnapshot(from:string,to:string){await mkdir(to,{recursive:true,mode:0o700});for(const entry of await readdir(from,{withFileTypes:true})){if(entry.name==="node_modules")continue;const input=join(from,entry.name),output=join(to,entry.name);if(entry.isDirectory())await copySnapshot(input,output);else if(entry.isFile()){await copyFile(input,output);await chmod(output,0o600);}}}
export async function runSuite(source:string){
  const policy=inspectCandidate(source);if(policy.some(check=>!check.passed))return {schemaVersion:1,stage:"policy_rejected",policy,tests:[],passed:false};
  const root=await mkdtemp("/tmp/fracture-candidate-");await copySnapshot("/snapshot",root);await symlink("/runtime/node_modules",join(root,"node_modules"),"dir");const file=join(root,"apps/fixtures/bramble/faulty.ts");await writeFile(file,source);
  let compileDiagnostics="";try{execFileSync("/runtime/node_modules/.bin/tsc",["--noEmit","-p",join(root,"tsconfig.candidate.json")],{cwd:root,timeout:20000,maxBuffer:512000,encoding:"utf8",stdio:["ignore","pipe","pipe"]});}catch(error){const output=error as {stdout?:string;stderr?:string};compileDiagnostics=String(output.stdout??output.stderr??"Compiler failed.").slice(0,12000);}
  if(compileDiagnostics)return {schemaVersion:1,stage:"compile_failed",policy,tests:[{id:"compile",name:"Strict candidate compile",status:"fail",hidden:false,durationMs:0,detail:compileDiagnostics}],passed:false};
  const loaded=await import(pathToFileURL(file).href) as {faultyCheckout?:(context:BrambleContext)=>Promise<unknown>};if(typeof loaded.faultyCheckout!=="function")return {schemaVersion:1,stage:"compile_failed",policy,tests:[{id:"entrypoint",name:"Original checkout export",status:"fail",hidden:false,durationMs:0,detail:"The candidate must export faultyCheckout."}],passed:false};
  const checkout=loaded.faultyCheckout;const tests:{id:string;name:string;status:"pass"|"fail";hidden:boolean;durationMs:number;detail:string}[]=[{id:"compile",name:"Strict candidate compile",status:"pass",hidden:false,durationMs:0,detail:"Pinned TypeScript compiler passed the candidate against the original interface."}];const results:Record<string,unknown>[]=[];
  for(const item of cases){const started=Date.now();const db=new SqliteDatabase(join(root,`${item.id}.sqlite`));await initializeDatabase(db);const store=new LabStore(db);const session=await store.createSession("owner");const scenario:ScenarioDTO={id:`hidden-${randomUUID()}`,title:item.name,shortTitle:item.name,description:"Frozen isolated repair regression",family:"Repair regression",suite:"local",mode:"sample",faultSource:"local_fixture",trigger:"Frozen case",phase:"checkout",invariantIds:["I1","I2","I3","I7","I8"],fixtureIds:["bramble"],available:true,gate:null,hash:sha256(JSON.stringify(item)),estimatedSeconds:5};const project:ProjectDTO={id:"bramble",name:"Bramble Books",description:"Frozen repair target",language:"TypeScript",kind:"bookshop",sourceHash:sha256(source),source:"sample",suitePassed:0,suiteTotal:0,revisions:[{id:"faulty",label:"Candidate",sourceHash:sha256(source)}],latestRunId:null,map:{nodes:[],edges:[],findings:[],limitations:[]}};const input:RunInput={projectId:"bramble",scenarioId:scenario.id,revision:"faulty",mode:"sample",seed:sha256(`repair-regression-v1:${item.id}`),requestId:randomUUID(),interactive:false};const run=newRun(input,scenario,project);await store.createRun(session.id,input,run);if(item.revoked)await db.query("INSERT INTO lab_faults(run_id,fault_key,document) VALUES($1,'approval-revoked',$2)",[run.id,JSON.stringify({source:"sample"})]);const transport=new LocalPayPalTransport(store,run.id,{...noFaults,...item.faults});let thrown=0;
    const invoke=async(index:number)=>{try{const next=item.changedAmount&&index>0?{...run,amountMinor:1300}:run;await checkout(targetCapabilities(store,next,session.id,transport));}catch{thrown++;}};
    if(item.concurrent)await Promise.all(Array.from({length:item.calls},(_,index)=>invoke(index)));else for(let i=0;i<item.calls;i++)await invoke(i);
    const observed:RunDTO=await refreshRun(store,run.id);const resourceReads=observed.events.filter(event=>event.kind==="resource_read").length;const assertions=[observed.captureCount===item.expected.captures,observed.fulfillmentCount===item.expected.fulfillments,item.expected.phone===undefined||observed.phoneState===item.expected.phone,observed.capturedMinor<=1200,!observed.events.some(event=>event.kind==="unknown_outcome_presented_failed"),!item.requireIdentity||observed.invariants.find(row=>row.id==="I8")?.verdict==="pass",item.revoked||item.changedAmount||thrown===0,item.id!=="lost"&&item.id!=="malformed"||resourceReads>0];const passed=assertions.every(Boolean);
    tests.push({id:item.id,name:item.name,status:passed?"pass":"fail",hidden:item.id!=="happy",durationMs:Date.now()-started,detail:`Observed ${observed.captureCount} completed captures, ${observed.fulfillmentCount} entitlements, ${observed.phoneState}; ${resourceReads} authoritative reads; ${thrown} refused/thrown calls.`});results.push({id:item.id,runId:run.id,source:"sample",sourceHash:run.sourceHash,scenarioHash:scenario.hash,seed:run.seed,captures:observed.captures,refunds:observed.refunds,events:observed.events,invariants:observed.invariants,assertions});await db.close();
  }
  return {schemaVersion:1,stage:"evaluated",source:"sample",policy,tests,passed:tests.every(test=>test.status==="pass"),results,compiler:"typescript@5.9.3",coreVersion:"0.2.2",candidateHash:sha256(source),suiteHash:sha256(await readFile("/snapshot/packages/isolation/runner/suite.ts","utf8")),isolation:{engine:"docker",network:"none",rootFilesystem:"read_only",hostMounts:0,realCredentials:false,maximumSeconds:55}};
}
