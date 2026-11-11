import {readFile,mkdir,readdir} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {loadStudy,defaultStudyId,readGeneration} from '../packages/evaluation/src/study';
import {verifyStudyReceipts} from '../packages/evaluation/src/study-integrity';
import {canonical,digest} from '../packages/evaluation/src/protocol';
import {readJson,optionalJson,saveNew,recursiveFiles} from '../packages/evaluation/src/artifacts';
import {summarize,validateGrades} from '../packages/evaluation/src/results';
import {ModelWorkspace} from '../packages/evaluation/src/model-workspace';
const args=process.argv.slice(2),index=args.indexOf('--study'),id=index>=0?args[index+1]!:defaultStudyId,root=resolve(import.meta.dirname,'..');
const {directory,p,frozen,rows}=await loadStudy(root,id);
if(await optionalJson(join(directory,'execution-lock.json')))throw new Error('Wait for the active coordinator to finish before sealing.');
const checked=await verifyStudyReceipts(root,directory,p,frozen);
if(args.includes('--verify-only')){console.log(JSON.stringify({status:'anonymous_receipts_verified',...checked.counts,comparisons:'withheld_until_seal'}));process.exit(0);}
if(checked.counts.missing)throw new Error(`Cannot seal: ${checked.counts.missing} original candidates have no terminal record.`);
const anonymousPath=join(directory,'grades.anonymous.json'),prior=await optionalJson(anonymousPath);
if(prior){if(canonical(prior)!==canonical(checked.grades))throw new Error('The anonymous result freeze differs from current receipts.');}else await saveNew(anonymousPath,checked.grades);
const files=[];
for(const path of await recursiveFiles(directory)){
  const name=relative(directory,path);if(name==='seal.json'||name==='progress.json'||name==='report.json'||name.startsWith('recovered-lock-')||name.endsWith('.tmp'))continue;
  files.push({path:name,sha256:digest(await readFile(path))});
}
let seal=await optionalJson(join(directory,'seal.json'));
if(seal){if(seal.fileManifestHash!==digest(canonical(files))||seal.gradesHash!==digest(canonical(checked.grades)))throw new Error('Sealed study artifacts changed.');}
else {seal={schemaVersion:1,studyId:id,protocolHash:frozen.protocolHash,sealedAt:new Date().toISOString(),gradesHash:digest(canonical(checked.grades)),fileManifestHash:digest(canonical(files)),files,counts:checked.counts,statement:'Anonymous grading histories and receipts were verified and frozen before treatment labels were joined.'};await saveNew(join(directory,'seal.json'),seal);}
// The first treatment/outcome join happens only after the immutable seal exists.
const summary=summarize(p,checked.grades),joined=validateGrades(p,checked.grades),qualification=await readJson(join(root,'evaluation/studies',id,'qualification.json'));
const displayRows=[];
for(const row of joined){
  const grade=row.grade!;
  const generation=await readGeneration(directory,row.candidateId,grade.attemptNumber),originalPath=join(directory,'attempts',row.candidateId,grade.attemptNumber===2&&row.history[0]!.sourceHash?'1':String(grade.attemptNumber)),workspace=await optionalJson(join(originalPath,'workspace.private.json'));
  if(workspace){const expected=await ModelWorkspace.load(root,p,row);if(canonical(workspace)!==canonical(expected.describe()))throw new Error('A model saw files outside its assigned frozen workspace.');for(const access of generation.toolAccesses){const actual=expected.execute(access.name,access.arguments as Record<string,unknown>);if(access.index<p.execution!.maximumToolCalls&&canonical(actual)!==canonical(access.result))throw new Error('A context access result differs from the assigned file allowlist.');}}
  const task=qualification.tasks.find((t:Record<string,unknown>)=>t.taskId===row.taskId);
  displayRows.push({candidateId:row.candidateId,taskId:row.taskId,title:task.title,family:row.family,language:row.language,model:row.modelId,arm:row.arm,repeat:row.repeat,split:row.split,passed:row.passed,status:grade.stage,compilePassed:grade.compilePassed,policyPassed:grade.policyPassed,hiddenPassed:grade.hiddenPassed,tests:grade.tests,sourceHash:grade.sourceHash,providerReceiptHash:grade.providerReceiptHash,runnerReceiptHash:grade.runnerReceiptHash,errorCode:grade.errorCode,attemptNumber:grade.attemptNumber,history:row.history,inputTokens:generation.inputTokens,outputTokens:generation.outputTokens,reasoningTokens:generation.reasoningTokens,totalTokens:generation.totalTokens,toolCalls:generation.toolAccesses.length,providerRequests:generation.calls.length,estimatedCostUsd:generation.estimatedCostUsd,unpricedCalls:generation.unpricedCalls,durationMs:grade.durationMs,evidencePath:`candidates/${row.candidateId}.json.gz`});
}
const unique=[...checked.generationReceipts.values()],report={...summary,id,status:'sealed',dataScope:'executed_model_offline_sdk',livePaymentOperations:0,sealedAt:seal.sealedAt,sealHash:digest(canonical(seal)),sourceCommit:frozen.sourceCommit,evaluatorHash:frozen.evaluatorHash,imageId:frozen.imageId,models:p.models,contexts:p.contexts,tasks:qualification.tasks,execution:p.execution,maximumOutputTokens:p.maximumOutputTokens,statistics:p.statistics,receiptCounts:checked.counts,usage:{inputTokens:unique.reduce((s,g)=>s+g.inputTokens,0),outputTokens:unique.reduce((s,g)=>s+g.outputTokens,0),reasoningTokens:unique.reduce((s,g)=>s+g.reasoningTokens,0),totalTokens:unique.reduce((s,g)=>s+g.totalTokens,0),estimatedCostUsd:unique.reduce((s,g)=>s+g.estimatedCostUsd,0),unpricedCalls:unique.reduce((s,g)=>s+g.unpricedCalls,0),costLabel:'Published-rate estimate; provider invoice and unpriced failed-call charges may differ.'},rows:displayRows};
const publicDir=join(root,'evaluation/studies',id),webDir=join(root,'apps/web/public/evaluations',id);
for(const target of [publicDir,webDir]){
  await mkdir(target,{recursive:true});
  for(const [name,value] of Object.entries({'report.json':report,'grades.anonymous.json':checked.grades,'seal.json':seal,'protocol.json':p,'freeze.json':frozen,'qualification.json':qualification})){
    const existing=await optionalJson(join(target,name));if(existing){if(canonical(existing)!==canonical(value))throw new Error(`Existing public artifact differs: ${name}`);}else await saveNew(join(target,name),value);
  }
}
for(const row of displayRows){
  const history=[];
  for(const grade of row.history){const path=join(directory,'attempts',row.candidateId,String(grade.attemptNumber));history.push({grade,generation:await readGeneration(directory,row.candidateId,grade.attemptNumber),runner:await optionalJson(join(path,'runner.json.gz'))});}
  const value={schemaVersion:1,studyId:id,candidateId:row.candidateId,taskId:row.taskId,protocolHash:frozen.protocolHash,dataScope:'executed_model_offline_sdk',privateReasoningIncluded:false,history};
  const target=join(webDir,row.evidencePath),existing=await optionalJson(target);if(existing){if(canonical(existing)!==canonical(value))throw new Error('Published candidate evidence changed.');}else await saveNew(target,value);
}
console.log(JSON.stringify({status:'sealed',studyId:id,planned:summary.planned,graded:summary.graded,infrastructureFailures:summary.infrastructureFailures,missing:summary.missing,resultHash:summary.resultHash,sealHash:report.sealHash,estimatedCostUsd:report.usage.estimatedCostUsd,report:join(webDir,'report.json')}));
