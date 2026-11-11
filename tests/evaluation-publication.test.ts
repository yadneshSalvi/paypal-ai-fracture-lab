import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {canonical,digest,parseProtocol} from '../packages/evaluation/src/protocol';
import {assignments} from '../packages/evaluation/src/schedule';
import {summarize,type Grade} from '../packages/evaluation/src/results';
import {readStudyPublication,readCandidateEvidence,readTaskEvidence,publishedStudyId} from '../packages/service/src/evaluation-publication';
import type {StudyAttempt} from '../packages/contracts/src/evaluation-study';
import {attemptOutcome,filterAttempts,emptyAttemptFilters,attemptsCsv,stratumFor} from '../apps/web/lib/evaluation-presentation';

async function setup(){
  const root=await mkdtemp(join(tmpdir(),'fracture-publication-')),dir=join(root,'evaluation/studies',publishedStudyId);
  await mkdir(dir,{recursive:true});for(const name of ['protocol.json','freeze.json','qualification.json'])await copyFile(join('evaluation/studies',publishedStudyId,name),join(dir,name));
  const p=parseProtocol(JSON.parse(await readFile(join(dir,'protocol.json'),'utf8'))),frozen=JSON.parse(await readFile(join(dir,'freeze.json'),'utf8')),qualification=JSON.parse(await readFile(join(dir,'qualification.json'),'utf8'));
  return {root,dir,p,frozen,qualification};
}
const write=async(path:string,value:unknown)=>writeFile(path,JSON.stringify(value,null,2)+'\n');

test('public running state exposes completion counts while withholding treatment, candidate and verdict records',async()=>{
  const f=await setup();try{
    const dir=join(f.root,'.artifacts/evaluation-studies',publishedStudyId);await mkdir(dir,{recursive:true});
    await write(join(dir,'progress.json'),{studyId:publishedStudyId,protocolHash:f.frozen.protocolHash,updatedAt:'2026-11-11T09:00:00.000Z',recordedCandidates:6,gradedCandidates:3,infrastructureCandidates:3,assignments:[{candidate:'SHOULD_NOT_LEAVE_PRIVATE_PROGRESS',arm:'B'}],passed:3});
    const publication=await readStudyPublication(f.root);assert.equal(publication.phase,'running');assert.equal(publication.recordedCandidates,6);assert.equal(publication.report,null);assert(!JSON.stringify(publication).includes('SHOULD_NOT_LEAVE_PRIVATE_PROGRESS'));assert(!('passed'in publication));
    await assert.rejects(readCandidateEvidence(assignments(f.p)[0]!.candidateId,f.root),/sealed study/);
    await assert.rejects(readTaskEvidence('../../.env',f.root),/frozen corpus/);
    await write(join(dir,'progress.json'),{studyId:publishedStudyId,protocolHash:f.frozen.protocolHash,updatedAt:'2026-11-11T09:00:00.000Z',recordedCandidates:6,gradedCandidates:6,infrastructureCandidates:3});await assert.rejects(readStudyPublication(f.root),/inconsistent/);
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('public result reader reproduces the sealed analysis and refuses an altered attempt display',async()=>{
  const f=await setup();try{
    // Synthetic unit fixture, never written to the product's actual publication directory.
    const rows=assignments(f.p),hash=digest('SYNTHETIC_VERIFIER_FIXTURE'),graderHash=digest(canonical(f.p.evaluatorFiles));
    const grades:Grade[]=rows.map((row,index)=>({schemaVersion:1,candidateId:row.candidateId,taskId:row.taskId,protocolHash:f.frozen.protocolHash,sourceHash:hash,graderHash,stage:'graded',compilePassed:true,policyPassed:true,hiddenPassed:index%3!==0,tests:[{id:'synthetic-invariant',passed:index%3!==0}],tokens:10,durationMs:100,providerReceiptHash:hash,runnerReceiptHash:hash,errorCode:null,retryOf:null,attemptNumber:1,finishedAt:'2026-11-11T09:00:00.000Z'}));
    const counts={planned:600,recordedCandidates:600,missing:0,attemptRecords:600,retries:0,modelGenerations:600,providerRequests:600,providerResponseRecords:600,unansweredDispatches:0};
    const seal={schemaVersion:1,studyId:publishedStudyId,protocolHash:f.frozen.protocolHash,sealedAt:'2026-11-11T09:00:00.000Z',gradesHash:digest(canonical(grades)),files:[],fileManifestHash:digest(canonical([])),counts,statement:'Synthetic unit fixture; not a real execution seal'};
    const report={...summarize(f.p,grades),id:publishedStudyId,status:'sealed',dataScope:'executed_model_offline_sdk',livePaymentOperations:0,sealedAt:seal.sealedAt,sealHash:digest(canonical(seal)),sourceCommit:f.frozen.sourceCommit,evaluatorHash:f.frozen.evaluatorHash,imageId:f.frozen.imageId,models:f.p.models,contexts:f.p.contexts,tasks:f.qualification.tasks,execution:f.p.execution,maximumOutputTokens:f.p.maximumOutputTokens,statistics:f.p.statistics,receiptCounts:counts,rows:rows.map((row,index)=>{const grade=grades[index]!,task=f.qualification.tasks.find((task:{taskId:string})=>task.taskId===row.taskId);return {candidateId:row.candidateId,taskId:row.taskId,title:task.title,family:row.family,model:row.modelId,language:row.language,arm:row.arm,repeat:row.repeat,split:row.split,passed:grade.hiddenPassed,status:grade.stage,compilePassed:grade.compilePassed,policyPassed:grade.policyPassed,hiddenPassed:grade.hiddenPassed,totalTokens:10,durationMs:100,history:[grade],tests:grade.tests,sourceHash:grade.sourceHash,providerReceiptHash:grade.providerReceiptHash,runnerReceiptHash:grade.runnerReceiptHash,errorCode:grade.errorCode,attemptNumber:grade.attemptNumber,evidencePath:`candidates/${row.candidateId}.json.gz`};})};
    await write(join(f.dir,'seal.json'),seal);await write(join(f.dir,'grades.anonymous.json'),grades);await write(join(f.dir,'report.json'),report);
    const publication=await readStudyPublication(f.root);assert.equal(publication.phase,'sealed');assert.equal(publication.report?.rows.length,600);assert.equal(publication.report?.strata.length,8);
    report.rows[0]!.passed=!report.rows[0]!.passed;await write(join(f.dir,'report.json'),report);await assert.rejects(readStudyPublication(f.root),/display differs/);
    report.rows[0]!.passed=!report.rows[0]!.passed;report.rows[0]!.evidencePath='https://unrelated.example/receipt';await write(join(f.dir,'report.json'),report);await assert.rejects(readStudyPublication(f.root),/evidence link differs/);
    report.rows[0]!.evidencePath=`candidates/${rows[0]!.candidateId}.json.gz`;report.livePaymentOperations=1;await write(join(f.dir,'report.json'),report);await assert.rejects(readStudyPublication(f.root),/metadata differs/);
  }finally{await rm(f.root,{recursive:true,force:true});}
});

test('attempt exploration distinguishes scored failures from infrastructure and keeps CSV unknowns explicit',()=>{
  const base={candidateId:'a'.repeat(40),taskId:'d1-ts-development',title:'Example task',family:'D1',language:'TypeScript',model:'model',arm:'A',repeat:1,split:'development',passed:false,status:'graded',compilePassed:false,policyPassed:true,hiddenPassed:false,tests:[],sourceHash:'x',providerReceiptHash:'y',runnerReceiptHash:'z',errorCode:null,attemptNumber:1,history:[],inputTokens:1,outputTokens:1,reasoningTokens:0,totalTokens:2,toolCalls:0,providerRequests:1,estimatedCostUsd:0,unpricedCalls:0,durationMs:100,evidencePath:'fixture'} as StudyAttempt;
  const infra={...base,candidateId:'b'.repeat(40),status:'infrastructure_failure',passed:null,compilePassed:null,policyPassed:null,hiddenPassed:null,errorCode:'provider_transport_unknown'} as StudyAttempt;
  assert.equal(attemptOutcome(base),'compilation');assert.equal(attemptOutcome(infra),'infrastructure');
  assert.equal(filterAttempts([base,infra],{...emptyAttemptFilters,outcome:'failed'}).length,1);assert.equal(filterAttempts([base,infra],{...emptyAttemptFilters,outcome:'infrastructure'})[0]!.passed,null);
  const csv=attemptsCsv([infra]);assert(csv.includes('"infrastructure","","","",""'));assert(csv.includes('final_generation_tokens'));
});

test('frozen corpus detail releases only the model-visible task and baseline before seal',async()=>{
  const task=await readTaskEvidence('d4-ts-heldout');
  if(!task.hiddenChecksReleased){assert.equal(task.golden,null);assert.deepEqual(task.controls,[]);assert(task.prompt.includes('immutable'));assert(task.baseline.length>0);}
});
