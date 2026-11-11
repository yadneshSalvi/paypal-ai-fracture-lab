import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonical,digest,families,languages,parseProtocol,verifyProtocolFiles,type Protocol} from '../packages/evaluation/src/protocol';
import {assignments,graderAssignment} from '../packages/evaluation/src/schedule';
import {summarize,validateGrades,pairedInterval,type Grade} from '../packages/evaluation/src/results';
const hash=digest('fixture'),file=(path:string)=>({path,sha256:digest(path)});
function protocol():Protocol{return parseProtocol({schemaVersion:1,id:'test-only-protocol',createdAt:'2026-11-11T00:00:00.000Z',
 tasks:families.flatMap(family=>languages.flatMap(language=>(['development','held_out'] as const).map(split=>({id:`${family}-${language}-${split}`,family,language,split,prompt:file('prompt.txt'),accessibleFiles:[file('contract.ts')],hiddenTests:[file('hidden.ts')],controlProof:file('control.json'),baselineSource:file('bad.ts'),hardenedSource:file('good.ts')})))),
 models:[{id:'openai-test',provider:'openai',version:'test-version',verifiedAt:'2026-11-11T00:00:00.000Z',settings:{temperature:0},honorsSeed:false},{id:'gemini-test',provider:'gemini',version:'test-version',verifiedAt:'2026-11-11T00:00:00.000Z',settings:{temperature:0},honorsSeed:false}],
 repeats:5,seedLabels:['one','two','three','four','five'],arms:['A','B','C'],contexts:['openai-test','gemini-test'].map(modelId=>({modelId,tokenizer:'test',tokenizationReceipt:file('tokens.json'),tokenBudget:1000,B:{files:[file('b.md')],tokens:1000},C:{files:[file('c.md')],tokens:995}})),
 promptTemplate:file('template.txt'),evaluatorFiles:[file('grader.ts')],runnerManifest:file('runner.json'),maximumOutputTokens:8192,maximumIterations:1,
 infrastructureRetry:{maximumRetries:1,retryable:['provider_429','provider_5xx','transport_before_response','runner_unavailable']},
 statistics:{resamples:10000,seed:'test-statistics',cluster:'task',comparisons:['B-A','B-C'],familywiseAlpha:.05,intervalMethod:'percentile_task_cluster_bootstrap',multiplicity:'bonferroni_two_comparisons'},limitations:['Synthetic harness qualification only; no model experiment.']});}
function grade(p:Protocol,index=0,passed=true):Grade{const row=assignments(p)[index]!;return {schemaVersion:1,candidateId:row.candidateId,taskId:row.taskId,protocolHash:digest(canonical(p)),sourceHash:hash,graderHash:digest(canonical(p.evaluatorFiles)),stage:'graded',compilePassed:true,policyPassed:true,hiddenPassed:passed,tests:[{id:'hidden-invariant',passed}],tokens:100,durationMs:10,providerReceiptHash:hash,runnerReceiptHash:hash,errorCode:null,retryOf:null,attemptNumber:1,finishedAt:'2026-11-11T01:00:00.000Z'};}
test('balanced protocol creates 600 unique stable assignments, 300 held out, randomized arms, arm-free grading',()=>{
 const p=protocol(),rows=assignments(p);assert.equal(rows.length,600);assert.equal(new Set(rows.map(r=>r.candidateId)).size,600);assert.equal(rows.filter(r=>r.split==='held_out').length,300);assert.deepEqual(rows,assignments(p));
 const orders=new Set();for(let i=0;i<rows.length;i+=3){const block=rows.slice(i,i+3);assert.equal(new Set(block.map(r=>`${r.taskId}/${r.modelId}/${r.repeat}`)).size,1);assert.deepEqual(block.map(r=>r.arm).sort(),['A','B','C']);orders.add(block.map(r=>r.arm).join(''));}assert.ok(orders.size>1);assert.deepEqual(Object.keys(graderAssignment(rows[0]!)),['candidateId','taskId']);
});
test('invalid split, hidden leakage, token mismatch and duplicate seeds cannot freeze',()=>{
 for(const mutate of [(p:Protocol)=>{p.tasks[0]!.split='held_out';},(p:Protocol)=>{p.tasks[0]!.accessibleFiles.push(file('hidden.ts'));},(p:Protocol)=>{p.contexts[0]!.B.files.push({path:'renamed.txt',sha256:digest('hidden.ts')});},(p:Protocol)=>{p.contexts[0]!.C.tokens=850;},(p:Protocol)=>{p.seedLabels[1]='one';}]){const p=protocol();mutate(p);assert.throws(()=>parseProtocol(p));}
});
test('file verification detects changed hashes, path traversal, secrets and symlink escape',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fracture-protocol-')),outside=await mkdtemp(join(tmpdir(),'fracture-outside-'));
 try{for(const name of ['prompt.txt','contract.ts','hidden.ts','control.json','bad.ts','good.ts','tokens.json','b.md','c.md','template.txt','grader.ts','runner.json'])await writeFile(join(root,name),name);const p=protocol();assert.equal((await verifyProtocolFiles(root,p)).plannedAttempts,600);
 await writeFile(join(root,'contract.ts'),'changed');await assert.rejects(verifyProtocolFiles(root,p),/Frozen file changed/);await writeFile(join(root,'contract.ts'),'contract.ts');
 for(const path of ['../outside','.env','plans/private.md','node_modules/package/source.ts']){const changed=protocol();changed.promptTemplate=file(path);await assert.rejects(verifyProtocolFiles(root,changed),/Unsafe corpus path/);}
 await writeFile(join(outside,'source.ts'),'fixture');await symlink(join(outside,'source.ts'),join(root,'escape.ts'));p.promptTemplate=file('escape.ts');await assert.rejects(verifyProtocolFiles(root,p),/escapes root/);
 }finally{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});
test('missing and infrastructure outcomes stay in the denominator and suppress incomplete intervals',()=>{
 const p=protocol(),g=grade(p),report=summarize(p,[g]);assert.equal(report.graded,1);assert.equal(report.missing,599);assert.ok(report.strata.every(s=>s.comparisons.every(c=>c.interval95===null)));
 const failure={...grade(p,1),stage:'infrastructure_failure',compilePassed:null,policyPassed:null,hiddenPassed:null,errorCode:'provider_429',providerReceiptHash:null,runnerReceiptHash:null,tests:[]};const next=summarize(p,[g,failure]);assert.equal(next.infrastructureFailures,1);assert.equal(next.missing,598);
});
test('retained first submission permits only one linked predeclared infrastructure retry',()=>{
 const p=protocol(),g=grade(p);assert.throws(()=>validateGrades(p,[g,g]),/replaced/);assert.throws(()=>validateGrades(p,[{...g,attemptNumber:2}]),/first attempt/);
 const failure:Grade={...g,sourceHash:null,stage:'infrastructure_failure',compilePassed:null,policyPassed:null,hiddenPassed:null,errorCode:'provider_429',providerReceiptHash:null,runnerReceiptHash:null,tests:[]};
 const second={...g,attemptNumber:2,retryOf:digest(canonical(failure))};assert.equal(summarize(p,[second,failure]).retries,1);
 assert.throws(()=>validateGrades(p,[g,{...second,retryOf:digest(canonical(g))}]),/predeclared/);assert.throws(()=>validateGrades(p,[failure,{...second,retryOf:hash}]),/predeclared/);
 const runnerFailure:Grade={...failure,sourceHash:g.sourceHash,providerReceiptHash:g.providerReceiptHash,errorCode:'runner_unavailable'};
 assert.throws(()=>validateGrades(p,[runnerFailure,{...second,sourceHash:digest('changed'),retryOf:digest(canonical(runnerFailure))}]),/same original/);
});
test('a success cannot hide missing tests, receipt hashes, policy failure or an unknown candidate',()=>{
 const p=protocol(),g=grade(p);assert.throws(()=>validateGrades(p,[{...g,tests:[]}]),/nonempty/);assert.throws(()=>validateGrades(p,[{...g,providerReceiptHash:null}]),/receipts/);assert.throws(()=>validateGrades(p,[{...g,candidateId:'f'.repeat(40)}]),/frozen protocol/);assert.throws(()=>validateGrades(p,[{...g,graderHash:hash}]),/different frozen/);assert.throws(()=>validateGrades(p,[{...g,policyPassed:false}]),/requires compilation, policy/);assert.equal(validateGrades(p,[{...g,policyPassed:false,hiddenPassed:false}]).find(r=>r.grade)?.passed,false);
});
test('executable protocol binds four language-specific token budgets and equal provider workers',()=>{
 const legacy=protocol(),p={...legacy,schemaVersion:2,contexts:legacy.contexts.flatMap(c=>languages.map(language=>({...c,language}))),execution:{maximumToolCalls:24,maximumToolResultCharacters:24000,maximumSourceBytes:120000,providerDeadlineMs:900000,providerConcurrency:4,gradingConcurrency:1,allowedTools:['list_files','read_file','search_files','inspect_baseline'],outputBudgetAccounting:'cumulative_provider_output_including_reasoning',accessPolicy:'explicit_frozen_files_only',firstSubmission:'one_final_source_no_edited_draft_execution'}};
 assert.equal(parseProtocol(p).contexts.length,4);assert.throws(()=>parseProtocol({...p,contexts:p.contexts.slice(0,2)}),/model and language/);assert.throws(()=>parseProtocol({...p,execution:{...p.execution,providerConcurrency:3}}),/equal worker/);
 const duplicated=structuredClone(p);duplicated.contexts[1]!.language='TypeScript';assert.throws(()=>parseProtocol(duplicated),/model and language/);
});
test('invalid final model output is a retained scored failure, never a free infrastructure retry',()=>{
 const p=protocol(),g=grade(p),failure={...g,stage:'submission_failure',sourceHash:null,compilePassed:false,policyPassed:false,hiddenPassed:false,tests:[],runnerReceiptHash:null,errorCode:'INVALID_FINAL_SOURCE'};
 const report=summarize(p,[failure]);assert.equal(report.graded,1);assert.equal(report.missing,599);assert.equal(report.infrastructureFailures,0);assert.equal(validateGrades(p,[failure]).find(r=>r.grade)?.passed,false);
 assert.throws(()=>validateGrades(p,[failure,{...g,attemptNumber:2,retryOf:digest(canonical(failure))}]),/predeclared infrastructure/);
});
test('paired bootstrap uses task clusters, reports neutral and negative comparisons, and is reproducible',()=>{
 assert.deepEqual(pairedInterval([0,0,0,0,0],'same'),{estimate:0,low:0,high:0,clusters:5,resamples:10000});assert.equal(pairedInterval([1],'same'),null);const interval=pairedInterval([-.4,.2,0,-.2,.4],'same');assert.deepEqual(interval,pairedInterval([-.4,.2,0,-.2,.4],'same'));
 const p=protocol(),rows=assignments(p),grades=rows.map((row,i)=>grade(p,i,row.arm==='A'||row.arm==='C'));
 const report=summarize(p,grades);assert.equal(report.graded,600);assert.equal(report.missing,0);assert.equal(report.strata.length,8);for(const s of report.strata)for(const c of s.comparisons){assert.equal(c.interval95?.estimate,-1);assert.equal(c.interval95?.clusters,5);assert.equal(c.familywiseInterval?.high,-1);}
});
