import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {canonical,digest,families,languages,parseProtocol} from '../packages/evaluation/src/protocol';
import {assignments,graderAssignment} from '../packages/evaluation/src/schedule';
import {saveNew} from '../packages/evaluation/src/artifacts';
import {verifyStudyReceipts} from '../packages/evaluation/src/study-integrity';
import {providerUsage,estimateCost} from '../packages/evaluation/src/gateway';

// Deliberately synthetic records exercise the verifier. They are never study artifacts.
const file=(path:string)=>({path,sha256:digest(path)});
function syntheticProtocol(){return parseProtocol({schemaVersion:1,id:'synthetic-integrity-only',createdAt:'2026-11-11T00:00:00.000Z',
  tasks:families.flatMap(family=>languages.flatMap(language=>(['development','held_out'] as const).map(split=>({id:`${family}-${language}-${split}`,family,language,split,prompt:file('prompt.txt'),accessibleFiles:[file('contract.ts')],hiddenTests:[file('hidden.ts')],controlProof:file('control.json'),baselineSource:file('bad.ts'),hardenedSource:file('good.ts')})))),
  models:[{id:'gpt-6.1-sol',provider:'openai',version:'synthetic',verifiedAt:'2026-11-11T00:00:00.000Z',settings:{},honorsSeed:false},{id:'gemini-3.8-flash',provider:'gemini',version:'synthetic',verifiedAt:'2026-11-11T00:00:00.000Z',settings:{},honorsSeed:false}],
  repeats:5,seedLabels:['one','two','three','four','five'],arms:['A','B','C'],contexts:['gpt-6.1-sol','gemini-3.8-flash'].map(modelId=>({modelId,tokenizer:'synthetic',tokenizationReceipt:file('tokens.json'),tokenBudget:1000,B:{files:[file('b.md')],tokens:1000},C:{files:[file('c.md')],tokens:1000}})),
  promptTemplate:file('template.txt'),evaluatorFiles:[file('grader.ts')],runnerManifest:file('runtime.json'),maximumOutputTokens:65536,maximumIterations:1,
  infrastructureRetry:{maximumRetries:1,retryable:['provider_429','provider_5xx','transport_before_response','runner_unavailable']},statistics:{resamples:10000,seed:'synthetic',cluster:'task',comparisons:['B-A','B-C'],familywiseAlpha:.05,intervalMethod:'percentile_task_cluster_bootstrap',multiplicity:'bonferroni_two_comparisons'},limitations:['Synthetic verifier test; no provider or candidate execution.']});}
const receipt=<T extends Record<string,unknown>>(value:T)=>({...value,receiptHash:digest(canonical(value))});
async function overwrite(path:string,value:unknown){const text=JSON.stringify(value,null,2)+'\n';await writeFile(path,path.endsWith('.gz')?gzipSync(text):text);}
async function fixture(){
  const directory=await mkdtemp(join(tmpdir(),'fracture-study-integrity-')),p=syntheticProtocol(),row=assignments(p).find(r=>r.modelId==='gpt-6.1-sol')!,protocolHash=digest(canonical(p)),evaluatorHash=digest('synthetic-evaluator'),imageId=`sha256:${digest('synthetic-image')}`;
  const path=join(directory,'attempts',row.candidateId,'1'),source='export const synthetic = true;',sourceHash=digest(source),request={model:row.modelId,store:false,reasoning:{effort:'max'},max_output_tokens:65536,input:'SYNTHETIC_TEST_ONLY'};
  const usage=providerUsage('openai',{usage:{input_tokens:40,output_tokens:20,output_tokens_details:{reasoning_tokens:10}}})!;
  const call={index:0,http:{provider:'openai',endpoint:'https://api.openai.com/v1/responses',requestHash:digest(canonical(request)),startedAt:'2026-11-11T01:00:00.000Z',finishedAt:'2026-11-11T01:00:00.500Z',durationMs:500,httpStatus:200,requestId:'SYNTHETIC_NOT_A_PROVIDER_RECEIPT',responseHash:digest('synthetic-response'),errorCode:null},responseId:'synthetic',reportedModel:row.modelId,status:'completed',usage,visibleOutput:[{type:'message',content:[{type:'output_text',text:JSON.stringify({source,summary:'synthetic'})}]}],estimatedCostUsd:estimateCost('openai',usage),costBasis:'Synthetic verifier fixture'};
  const generation=receipt({schemaVersion:1,kind:'model_generation',provider:'openai',model:row.modelId,status:'completed',source,sourceHash,summary:'synthetic',errorCode:null,calls:[call],toolAccesses:[],inputTokens:40,outputTokens:20,reasoningTokens:10,totalTokens:60,estimatedCostUsd:call.estimatedCostUsd,unpricedCalls:0,durationMs:500,finishedAt:'2026-11-11T01:00:00.500Z'});
  const result=receipt({sourceHash,evaluatorHash,isolation:{imageId,networkMode:'none',readOnlyRoot:true,mountCount:0,credentialEnvironmentForwarded:false,hiddenTestsInsideContainer:false},compilePassed:true,policyPassed:true,hiddenPassed:false,tests:[{id:'synthetic-invariant',passed:false}]});
  const runner=receipt({kind:'anonymous_executed_grade',candidateId:row.candidateId,taskId:row.taskId,protocolHash,sourceHash,evaluatorHash,result});
  const grade={schemaVersion:1,candidateId:row.candidateId,taskId:row.taskId,protocolHash,sourceHash,graderHash:digest(canonical(p.evaluatorFiles)),stage:'graded',compilePassed:true,policyPassed:true,hiddenPassed:false,tests:result.tests,tokens:60,durationMs:1000,providerReceiptHash:generation.receiptHash,runnerReceiptHash:runner.receiptHash,errorCode:null,retryOf:null,attemptNumber:1,finishedAt:'2026-11-11T01:00:01.000Z'};
  await saveNew(join(directory,'grader-queue.json'),assignments(p).map(graderAssignment));
  await saveNew(join(path,'started.json'),{candidateId:row.candidateId,taskId:row.taskId,protocolHash,attemptNumber:1,retryOf:null,startedAt:'2026-11-11T01:00:00.000Z'});
  await saveNew(join(path,'calls','000-dispatch.json.gz'),{provider:'openai',request,requestHash:call.http.requestHash,dispatchedAt:'2026-11-11T01:00:00.000Z'});
  await saveNew(join(path,'calls','000-response.json.gz'),call);
  await saveNew(join(path,'generation.json.gz'),generation);await saveNew(join(path,'runner.json.gz'),runner);await saveNew(join(path,'grade.json'),grade);
  return {directory,path,p,row,grade,generation,request,frozen:{protocolHash,evaluatorHash,imageId}};
}

test('anonymous receipt verification rejects changed verdicts, provider requests and original candidate identities',async()=>{
  const f=await fixture();try{
    const checked=await verifyStudyReceipts(f.directory,f.directory,f.p,f.frozen);assert.equal(checked.counts.recordedCandidates,1);assert.equal(checked.counts.missing,599);assert.equal(checked.counts.providerRequests,1);
    await overwrite(join(f.path,'grade.json'),{...f.grade,hiddenPassed:true});await assert.rejects(verifyStudyReceipts(f.directory,f.directory,f.p,f.frozen),/differs from executed checks/);
    await overwrite(join(f.path,'grade.json'),f.grade);
    await overwrite(join(f.path,'calls','000-dispatch.json.gz'),{request:{...f.request,max_output_tokens:999999},requestHash:digest(canonical(f.request))});await assert.rejects(verifyStudyReceipts(f.directory,f.directory,f.p,f.frozen),/dispatch or response receipt changed/);
    await overwrite(join(f.directory,'grader-queue.json'),assignments(f.p).map(graderAssignment).map((r,i)=>i? r:{...r,candidateId:'f'.repeat(40)}));await assert.rejects(verifyStudyReceipts(f.directory,f.directory,f.p,f.frozen),/original frozen assignments/);
  }finally{await rm(f.directory,{recursive:true,force:true});}
});

test('an interrupted dispatched request stays counted with unknown charges and no target verdict',async()=>{
  const f=await fixture();try{
    await rm(join(f.path,'calls','000-response.json.gz'));
    const generation=receipt({schemaVersion:1,kind:'model_generation',provider:'openai',model:f.row.modelId,status:'infrastructure_failure',source:null,sourceHash:null,summary:null,errorCode:'coordinator_interrupted_unknown',calls:[],toolAccesses:[],inputTokens:0,outputTokens:0,reasoningTokens:0,totalTokens:0,estimatedCostUsd:0,unpricedCalls:1,durationMs:0,finishedAt:'2026-11-11T01:00:01.000Z'});
    await overwrite(join(f.path,'generation.json.gz'),generation);await overwrite(join(f.path,'grade.json'),{...f.grade,stage:'infrastructure_failure',sourceHash:null,compilePassed:null,policyPassed:null,hiddenPassed:null,tests:[],tokens:0,providerReceiptHash:generation.receiptHash,runnerReceiptHash:null,errorCode:'coordinator_interrupted_unknown'});
    const checked=await verifyStudyReceipts(f.directory,f.directory,f.p,f.frozen);assert.equal(checked.counts.providerRequests,1);assert.equal(checked.counts.providerResponseRecords,0);assert.equal(checked.counts.unansweredDispatches,1);assert.equal(checked.grades[0]!.hiddenPassed,null);
  }finally{await rm(f.directory,{recursive:true,force:true});}
});
