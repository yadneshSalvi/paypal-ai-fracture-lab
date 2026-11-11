import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {CandidateSandbox,InfrastructureFailure,type Ready} from './isolation';
import {definition,runCase,type InvariantResult} from './cases';
import {EvaluationWorld,type Data} from './world';
import {digest,canonical} from './protocol';
import {evaluatorIdentity} from './identity';

/** Treatment assignments are deliberately not accepted by this interface. */
export async function gradeSource(root:string,taskId:string,source:string,visibility:'all'|'public'='all'){
  const task=definition(taskId),started=Date.now(),evaluator=await evaluatorIdentity(root);await mkdir(join(root,'.artifacts/evaluation-grading'),{recursive:true});const directory=await mkdtemp(join(root,'.artifacts/evaluation-grading','candidate-'));
  let sandbox:CandidateSandbox|undefined;
  try{
    sandbox=await CandidateSandbox.open(root,source,task.language);let ready:Ready;
    try{ready=await sandbox.ready;}catch(error){
      if(error instanceof InfrastructureFailure)throw error;
      ready={kind:'ready',sourceHash:digest(source),compilePassed:false,policy:{passed:false,findings:[{line:1,code:'COMPILATION_BOUNDARY_TERMINATED'}]},diagnostics:String(error instanceof Error?error.message:'Compilation boundary terminated').slice(0,500),runtime:'terminated_before_ready',errorCode:'COMPILATION_BOUNDARY_TERMINATED'};
    }
    const tests:InvariantResult[]=[],cases:Data[]=[];
    if(ready.compilePassed&&ready.policy.passed)for(const test of task.cases.filter(t=>visibility==='all'||t.visibility==='public')){
      const world=new EvaluationWorld(join(directory,`${test.id}.sqlite`));
      try{const checks=await runCase(test,world,sandbox);tests.push(...checks);cases.push({id:test.id,visibility:test.visibility,checks,observation:world.snapshot()});}
      finally{world.close();}
    }
    sandbox.close();const receipt={schemaVersion:1,source:'deterministic_offline_sdk',taskId,sourceHash:digest(source),evaluatorHash:evaluator.sha256,compilePassed:ready.compilePassed,policyPassed:ready.policy.passed,hiddenPassed:ready.compilePassed&&ready.policy.passed&&tests.length>0&&tests.every(t=>t.passed),diagnostics:ready.diagnostics,policy:ready.policy,tests,cases,isolation:sandbox.receipt,durationMs:Date.now()-started};
    return {...receipt,receiptHash:digest(canonical(receipt))};
  }finally{sandbox?.close();await rm(directory,{recursive:true,force:true});}
}
