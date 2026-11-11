import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical,digest,parseProtocol,verifyProtocolFiles,type Protocol} from './protocol';
import {assignments,type Assignment} from './schedule';
import {evaluatorIdentity} from './identity';
import {readJson,optionalJson,saveNew,verifyReceipt} from './artifacts';
import {ModelWorkspace} from './model-workspace';
import {generateCandidate,type Generation,type GenerationCall} from './gateway';
import {evaluationCredentials} from './provider-http';
import {runAnonymous} from './blind-runner';
import {gradeSchema,type Grade} from './results';

export const defaultStudyId='fracture-context-2026-11-v1';
export function studyDirectory(root:string,id:string){if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('Invalid study identifier.');return join(root,'.artifacts/evaluation-studies',id);}
export async function loadStudy(root:string,id:string){
  const directory=studyDirectory(root,id),p=parseProtocol(await readJson(join(directory,'protocol.json'))),frozen=await readJson(join(directory,'freeze.json'));
  if(p.schemaVersion!==2||p.id!==id||!p.execution)throw new Error('An executable frozen version-2 protocol is required.');
  const proof=await verifyProtocolFiles(root,p),evaluator=await evaluatorIdentity(root);
  if(proof.protocolHash!==frozen.protocolHash||evaluator.sha256!==frozen.evaluatorHash||digest(await readFile(join(directory,'protocol.json')))!==frozen.protocolFileHash)throw new Error('The preregistration has changed.');
  const rows=assignments(p),stored=await readJson(join(directory,'assignments.private.json'));
  if(canonical(stored)!==canonical(rows))throw new Error('Original candidate assignments changed.');
  return {directory,p,frozen,rows};
}
export async function readGrades(directory:string):Promise<Grade[]>{
  let names:string[];try{names=await readdir(join(directory,'attempts'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const grades:Grade[]=[];
  for(const id of names.sort()){
    if(!/^[a-f0-9]{40}$/.test(id))throw new Error('Unexpected candidate artifact directory.');
    for(const attempt of [1,2]){const grade=await optionalJson(join(directory,'attempts',id,String(attempt),'grade.json'));if(grade)grades.push(gradeSchema.parse(grade));}
  }
  return grades;
}
export async function readGeneration(directory:string,candidateId:string,attemptNumber:number):Promise<Generation>{
  const path=join(directory,'attempts',candidateId,String(attemptNumber)),direct=await optionalJson<Generation>(join(path,'generation.json.gz'));
  if(direct)return verifyReceipt(direct);
  const ref=await readJson(join(path,'generation-reference.json'));
  if(ref.candidateId!==candidateId||ref.attemptNumber!==1||attemptNumber!==2)throw new Error('Invalid source-preserving runner retry.');
  const original=verifyReceipt(await readJson<Generation>(join(directory,'attempts',candidateId,'1','generation.json.gz')));
  if(original.receiptHash!==ref.receiptHash||original.sourceHash!==ref.sourceHash)throw new Error('Runner retry changed the original provider submission.');return original;
}
async function recoverInterruptedGeneration(path:string,provider:'openai'|'gemini',model:string):Promise<Generation|null>{
  let files:string[];try{files=await readdir(join(path,'calls'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
  const dispatched=files.filter(n=>n.endsWith('-dispatch.json.gz'));if(!dispatched.length)return null;
  const calls:GenerationCall[]=[];
  for(const file of files.filter(n=>n.endsWith('-response.json.gz')).sort())calls.push(await readJson(join(path,'calls',file)));
  const toolAccesses:Generation['toolAccesses']=[];
  for(const file of files.filter(n=>n.endsWith('-tool.json.gz')).sort())toolAccesses.push(await readJson(join(path,'calls',file)));
  const record={schemaVersion:1 as const,kind:'model_generation' as const,provider,model,status:'infrastructure_failure' as const,source:null,sourceHash:null,summary:null,errorCode:'coordinator_interrupted_unknown',calls,toolAccesses,inputTokens:calls.reduce((s,c)=>s+(c.usage?.inputTokens??0),0),outputTokens:calls.reduce((s,c)=>s+(c.usage?.outputTokens??0),0),reasoningTokens:calls.reduce((s,c)=>s+(c.usage?.reasoningTokens??0),0),totalTokens:calls.reduce((s,c)=>s+(c.usage?.totalTokens??0),0),estimatedCostUsd:calls.reduce((s,c)=>s+(c.estimatedCostUsd??0),0),unpricedCalls:dispatched.length-calls.filter(c=>c.usage).length,durationMs:0,finishedAt:new Date().toISOString()};
  return {...record,receiptHash:digest(canonical(record))};
}
export async function executeStudy(root:string,id:string,firstBlock=false){
  const {directory,p,frozen,rows}=await loadStudy(root,id);
  if(await optionalJson(join(directory,'seal.json')))throw new Error('This study is sealed. Settled attempts cannot be rerun.');
  const keys=await evaluationCredentials(root),lock=join(directory,'execution-lock.json'),priorLock=await optionalJson(lock);
  if(priorLock){let live=true;try{process.kill(Number(priorLock.pid),0);}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')live=false;else throw error;}if(live)throw new Error('A study coordinator is already running.');await rename(lock,join(directory,`recovered-lock-${Date.now()}.json`));}
  await saveNew(lock,{pid:process.pid,startedAt:new Date().toISOString(),purpose:'exclusive_study_execution'});
  const selected=firstBlock?rows.filter(r=>r.taskId===p.tasks[0]!.id&&r.repeat===1):rows;
  let grading=Promise.resolve(),completed=0;
  const terminal=new Map<string,Grade>();for(const grade of await readGrades(directory)){const old=terminal.get(grade.candidateId);if(!old||grade.attemptNumber>old.attemptNumber)terminal.set(grade.candidateId,grade);}
  async function progress(){
    const value={schemaVersion:1,studyId:id,protocolHash:frozen.protocolHash,phase:'running',planned:600,heldOutPlanned:300,recordedCandidates:terminal.size,gradedCandidates:[...terminal.values()].filter(g=>g.stage==='graded'||g.stage==='submission_failure').length,infrastructureCandidates:[...terminal.values()].filter(g=>g.stage==='infrastructure_failure').length,comparativeResults:'withheld_until_result_seal',updatedAt:new Date().toISOString()};
    const path=join(directory,`progress-${process.pid}-${++completed}.tmp`);await writeFile(path,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(path,join(directory,'progress.json'));
  }
  async function gradeAttempt(row:Assignment,number:1|2,generation:Generation,retryOf:string|null,path:string){
    const common={schemaVersion:1 as const,candidateId:row.candidateId,taskId:row.taskId,protocolHash:frozen.protocolHash,sourceHash:generation.sourceHash,graderHash:digest(canonical(p.evaluatorFiles)),tokens:generation.totalTokens,durationMs:generation.durationMs,providerReceiptHash:generation.receiptHash,attemptNumber:number,retryOf,finishedAt:new Date().toISOString()};
    let grade:Grade;
    if(generation.status==='infrastructure_failure')grade=gradeSchema.parse({...common,stage:'infrastructure_failure',compilePassed:null,policyPassed:null,hiddenPassed:null,tests:[],runnerReceiptHash:null,errorCode:generation.errorCode});
    else if(generation.status==='submission_failure')grade=gradeSchema.parse({...common,stage:'submission_failure',compilePassed:false,policyPassed:false,hiddenPassed:false,tests:[],runnerReceiptHash:null,errorCode:generation.errorCode});
    else {
      if(generation.source===null||!generation.sourceHash)throw new Error('A completed provider receipt lacks source.');
      const source=generation.source,sourceHash=generation.sourceHash;
      const job={candidateId:row.candidateId,taskId:row.taskId,protocolHash:String(frozen.protocolHash),evaluatorHash:String(frozen.evaluatorHash),sourceHash,source};
      let receipt=await optionalJson(join(path,'runner.json.gz'));
      if(!receipt){
        const execute=async()=>{
          try{
            if(await optionalJson(join(path,'anonymous-job.json.gz')))throw new Error('A prior anonymous execution was interrupted before its receipt was saved.');
            await saveNew(join(path,'anonymous-job.json.gz'),job);
            return await runAnonymous(root,job);
          }catch(error){
            const failure={schemaVersion:1,kind:'anonymous_runner_failure',candidateId:row.candidateId,taskId:row.taskId,protocolHash:frozen.protocolHash,evaluatorHash:frozen.evaluatorHash,sourceHash,errorCode:'runner_unavailable',diagnostic:String(error instanceof Error?error.message:'Anonymous runner failed').slice(0,500),finishedAt:new Date().toISOString()};return {...failure,receiptHash:digest(canonical(failure))};
          }
        };
        // Only one container grader runs, independently of provider generation.
        const current=grading.then(execute);grading=current.then(()=>undefined,()=>undefined);receipt=await current;await saveNew(join(path,'runner.json.gz'),receipt);
      }
      verifyReceipt(receipt);
      if(receipt.kind==='anonymous_runner_failure')grade=gradeSchema.parse({...common,stage:'infrastructure_failure',compilePassed:null,policyPassed:null,hiddenPassed:null,tests:[],runnerReceiptHash:receipt.receiptHash,errorCode:'runner_unavailable'});
      else {const result=verifyReceipt(receipt.result);grade=gradeSchema.parse({...common,stage:'graded',compilePassed:result.compilePassed,policyPassed:result.policyPassed,hiddenPassed:result.hiddenPassed,tests:result.tests.map((t:Record<string,unknown>)=>({id:t.id,passed:t.passed})),durationMs:generation.durationMs+result.durationMs,runnerReceiptHash:receipt.receiptHash,errorCode:null});}
    }
    const began=await readJson(join(path,'started.json'));grade.finishedAt=new Date().toISOString();grade.durationMs=Math.max(0,Date.parse(grade.finishedAt)-Date.parse(began.startedAt));await saveNew(join(path,'grade.json'),grade);terminal.set(row.candidateId,grade);await progress();return grade;
  }
  async function candidate(row:Assignment){
    const model=p.models.find(m=>m.id===row.modelId)!;
    let first:Grade|null=null;
    for(const number of [1,2] as const){
      const path=join(directory,'attempts',row.candidateId,String(number)),existing=await optionalJson<Grade>(join(path,'grade.json'));
      if(existing){if(number===1)first=gradeSchema.parse(existing);else return;}
      if(number===2){
        if(!first||first.stage!=='infrastructure_failure'||!p.infrastructureRetry.retryable.includes(first.errorCode as typeof p.infrastructureRetry.retryable[number]))return;
        if(!existing){const remaining=30000-(Date.now()-Date.parse(first.finishedAt));if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));}
      }
      if(existing)continue;
      const retryOf=number===2?digest(canonical(first)):null;
      const started=await optionalJson(join(path,'started.json'));
      if(!started)await saveNew(join(path,'started.json'),{schemaVersion:1,candidateId:row.candidateId,taskId:row.taskId,protocolHash:frozen.protocolHash,attemptNumber:number,retryOf,startedAt:new Date().toISOString()});
      let generation=await optionalJson<Generation>(join(path,'generation.json.gz'));
      if(!generation&&number===2&&first?.sourceHash){
        generation=await readGeneration(directory,row.candidateId,1);
        const reference={candidateId:row.candidateId,attemptNumber:1,receiptHash:generation.receiptHash,sourceHash:generation.sourceHash};
        if(!await optionalJson(join(path,'generation-reference.json')))await saveNew(join(path,'generation-reference.json'),reference);
      }
      if(!generation){
        generation=await recoverInterruptedGeneration(path,model.provider,model.id);
        if(!generation){
          const workspace=await ModelWorkspace.load(root,p,row);
          if(!await optionalJson(join(path,'workspace.private.json')))await saveNew(join(path,'workspace.private.json'),workspace.describe());
          generation=await generateCandidate({provider:model.provider,model:model.id,key:keys[model.provider],maximumOutputTokens:p.maximumOutputTokens,maximumToolCalls:p.execution!.maximumToolCalls,maximumSourceBytes:p.execution!.maximumSourceBytes,providerDeadlineMs:p.execution!.providerDeadlineMs,system:workspace.system,prompt:workspace.prompt,execute:(name,args)=>workspace.execute(name,args),persist:(kind,index,value)=>saveNew(join(path,'calls',`${String(index).padStart(3,'0')}-${kind}.json.gz`),value)});
        }
        await saveNew(join(path,'generation.json.gz'),generation);
      }
      verifyReceipt(generation);
      const grade=await gradeAttempt(row,number,generation,retryOf,path);if(number===1)first=grade;
      console.log(JSON.stringify({event:'candidate_recorded',candidateId:row.candidateId,attemptNumber:number,stage:grade.stage,recordedCandidates:terminal.size,planned:600}));
      if(grade.stage!=='infrastructure_failure')return;
    }
  }
  try{
    await progress();const workers=[];let stopped=false;
    for(const model of p.models){const queue=selected.filter(r=>r.modelId===model.id);let cursor=0;for(let i=0;i<p.execution!.providerConcurrency/2;i++)workers.push((async()=>{try{for(;;){if(stopped)return;const row=queue[cursor++];if(!row)return;await candidate(row);}}catch(error){stopped=true;throw error;}})());}
    const outcomes=await Promise.allSettled(workers);await grading;await progress();
    const failed=outcomes.find((o):o is PromiseRejectedResult=>o.status==='rejected');if(failed)throw failed.reason;
    return {studyId:id,selectedCandidates:selected.length,recordedCandidates:terminal.size,planned:600,status:firstBlock?'first_block_recorded':'execution_finished',results:'withheld_until_result_seal'};
  }finally{
    const {unlink}=await import('node:fs/promises');await unlink(lock);
  }
}
