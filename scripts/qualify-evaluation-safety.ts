import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {CandidateSandbox} from '../packages/evaluation/src/isolation';
import {EvaluationWorld} from '../packages/evaluation/src/world';
import {evaluatorIdentity} from '../packages/evaluation/src/identity';
import {gradeSource} from '../packages/evaluation/src/grader';
import {canonical,digest} from '../packages/evaluation/src/protocol';

const root=resolve(import.meta.dirname,'..');
const probes=[
  {id:'host-files',language:'TypeScript' as const,source:"import {readFileSync} from 'node:fs'; export const handle=()=>({status:readFileSync('/etc/passwd','utf8'),httpStatus:200});",code:'IMPORT_BOUNDARY'},
  {id:'environment',language:'TypeScript' as const,source:"export const handle=()=>({status:process.env.HOME,httpStatus:200});",code:'AMBIENT_CAPABILITY'},
  {id:'egress',language:'TypeScript' as const,source:"export const handle=async()=>({status:await fetch('https://example.com'),httpStatus:200});",code:'AMBIENT_CAPABILITY'},
  {id:'reflection',language:'TypeScript' as const,source:"export const handle=()=>({status:({}).constructor,httpStatus:200});",code:'REFLECTION_OR_TRANSPORT'},
  {id:'subprocess',language:'Python' as const,source:"import subprocess\nfrom api import Context,Data\ndef handle(ctx:Context,command:Data)->Data:\n    return {'status':subprocess.check_output(['id']).decode(),'httpStatus':200}\n",code:'IMPORT_BOUNDARY'},
  {id:'python-egress',language:'Python' as const,source:"import httpx2 as net\nfrom api import Context,Data\ndef handle(ctx:Context,command:Data)->Data:\n    return {'status':net.get('https://example.com').status_code,'httpStatus':200}\n",code:'NETWORK_CAPABILITY'},
  {id:'control-descriptor-write',language:'TypeScript' as const,source:"import {writeSync} from 'node:fs'; export const handle=()=>{writeSync(3,'forged');return {status:'completed',httpStatus:200};};",code:'IMPORT_BOUNDARY'},
  {id:'private-console-pipe',language:'TypeScript' as const,source:"export const handle=()=>{const logger:any=console;logger._stdout._handle.open(3);return {status:'completed',httpStatus:200};};",code:'PRIVATE_CAPABILITY'},
];
const results:Array<Record<string,unknown>>=[];
process.on('uncaughtException',error=>{void (async()=>{const evaluator=await evaluatorIdentity(root),runtime=JSON.parse(await readFile(join(root,'evaluation/runtime-lock/manifest.json'),'utf8'));const failed={schemaVersion:1,executedAt:new Date().toISOString(),evaluatorHash:evaluator.sha256,imageId:runtime.imageId,allPassed:false,error:{name:error.name,message:error.message},completedProbes:results};await mkdir(join(root,'evaluation/qualification/history'),{recursive:true});await writeFile(join(root,'evaluation/qualification/history',`safety-failed-${Date.now()}.json`),JSON.stringify({...failed,receiptHash:digest(canonical(failed))},null,2)+'\n');process.stderr.write(`${error.name}: ${error.message}\n`);process.exit(1);})();});
for(const probe of probes){
  const sandbox=await CandidateSandbox.open(root,probe.source,probe.language);
  try{const ready=await sandbox.ready;assert.equal(ready.policy.passed,false);assert(ready.policy.findings.some(f=>f.code===probe.code));results.push({id:probe.id,passed:true,sourceHash:digest(probe.source),ready,isolation:sandbox.receipt});}
  finally{sandbox.close();}
  console.log(JSON.stringify({probe:probe.id,passed:true}));
}
// The target's own success claim never becomes a grade or payment observation.
const forged="import type {Context,Data,Result} from './api.js'; export async function handle(_c:Context,_x:Data):Promise<Result>{return {status:'completed',httpStatus:200,passed:true,hiddenPassed:true};}";
const falseSuccess=await gradeSource(root,'d1-ts-development',forged);
assert(falseSuccess.compilePassed&&falseSuccess.policyPassed&&!falseSuccess.hiddenPassed);
assert(falseSuccess.cases.every(c=>c.observation.captures.length===0));
results.push({id:'forged-grade',passed:true,receipt:falseSuccess});
const stdoutForge="import type {Context,Data,Result} from './api.js'; export async function handle(_c:Context,_x:Data):Promise<Result>{console.log(JSON.stringify({kind:'rpc',id:1,method:'wire',input:{method:'POST',path:'/v2/checkout/orders/attack-order/capture',headers:{},body:{}}}));return {status:'completed',httpStatus:200};}";
const forgedSandbox=await CandidateSandbox.open(root,stdoutForge,'TypeScript'),forgedWorld=new EvaluationWorld(':memory:');
try{forgedWorld.seed('intents','attack',{amountMinor:1200,currency:'USD'});forgedWorld.addOrder('attack','attack-order');const ready=await forgedSandbox.ready;assert(ready.compilePassed&&ready.policy.passed);const returned=await forgedSandbox.invoke(forgedWorld,{});assert.equal(returned.value?.status,'completed');assert.equal(forgedWorld.captures.size,0);assert.equal(forgedWorld.observations.length,0);results.push({id:'stdout-cannot-forge-sdk-wire',passed:true,sourceHash:digest(stdoutForge),returned,isolation:forgedSandbox.receipt});}
finally{forgedSandbox.close();forgedWorld.close();}
// A bounded nonterminating target proves the timeout belongs to the supervisor.
const loop="import type {Context,Data,Result} from './api.js'; export async function handle(_c:Context,_x:Data):Promise<Result>{while(true){} }";
const sandbox=await CandidateSandbox.open(root,loop,'TypeScript'),world=new EvaluationWorld(':memory:');
try{const ready=await sandbox.ready;assert(ready.compilePassed&&ready.policy.passed);const started=Date.now(),result=await sandbox.invoke(world,{}),elapsedMs=Date.now()-started;assert.equal(result.error?.code,'TARGET_TIMEOUT');assert(elapsedMs<20000);results.push({id:'bounded-execution',passed:true,elapsedMs,result,isolation:sandbox.receipt});}
finally{sandbox.close();world.close();}
const evaluator=await evaluatorIdentity(root),runtime=JSON.parse(await readFile(join(root,'evaluation/runtime-lock/manifest.json'),'utf8'));
const receipt={schemaVersion:1,executedAt:new Date().toISOString(),evaluatorHash:evaluator.sha256,imageId:runtime.imageId,allPassed:results.every(r=>r.passed),controlChannel:'authenticated_fd3',probes:results};
await mkdir(join(root,'evaluation/qualification'),{recursive:true});
await writeFile(join(root,'evaluation/qualification/safety.json'),JSON.stringify({...receipt,receiptHash:digest(canonical(receipt))},null,2)+'\n');
await mkdir(join(root,'evaluation/qualification/history'),{recursive:true});await writeFile(join(root,'evaluation/qualification/history',`safety-${Date.now()}.json`),JSON.stringify({...receipt,receiptHash:digest(canonical(receipt))},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({stage:'safety_qualified',probes:results.length,evaluatorHash:evaluator.sha256,imageId:runtime.imageId}));
