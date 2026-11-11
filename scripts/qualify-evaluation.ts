import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {taskDefinitions} from '../packages/evaluation/src/cases';
import {gradeSource} from '../packages/evaluation/src/grader';
import {digest} from '../packages/evaluation/src/protocol';
import {gzipSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'..'),selected=process.argv[2],historyId=new Date().toISOString().replaceAll(':','-');
for(const task of taskDefinitions.filter(t=>!selected||t.id===selected||t.id.startsWith(`${selected}-`))){
  const path=join(root,'evaluation/corpus/tasks',task.id),ext=task.language==='TypeScript'?'ts':'py';
  const results=[];
  for(const control of ['baseline','golden']){
    const source=await readFile(join(path,`${control}.${ext}`),'utf8');const result=await gradeSource(root,task.id,source);results.push({control,sourceHash:digest(source),result});
    console.log(JSON.stringify({task:task.id,control,compile:result.compilePassed,policy:result.policyPassed,passed:result.hiddenPassed,tests:result.tests.length,failed:result.tests.filter(t=>!t.passed).map(t=>t.id),diagnostics:result.diagnostics,policyFindings:result.policy.findings}));
  }
  await mkdir(join(root,'.artifacts/evaluation-controls'),{recursive:true});await writeFile(join(root,'.artifacts/evaluation-controls',`${task.id}.json`),JSON.stringify(results,null,2)+'\n');
  const history=join(root,'evaluation/qualification/history',`controls-${historyId}`);await mkdir(history,{recursive:true});await writeFile(join(history,`${task.id}.json.gz`),gzipSync(JSON.stringify(results)+'\n',{level:9}),{flag:'wx'});
  const bad=results[0]!,good=results[1]!;const qualified=bad.result.compilePassed&&bad.result.policyPassed&&!bad.result.hiddenPassed&&good.result.hiddenPassed;
  if(!qualified)process.exitCode=1;
  await mkdir(join(root,'evaluation/controls'),{recursive:true});
  const raw=gzipSync(JSON.stringify(results)+'\n',{level:9}),receiptPath=`evaluation/controls/${task.id}.json.gz`;
  await writeFile(join(root,receiptPath),raw);
  await writeFile(join(path,'control-proof.json'),JSON.stringify({schemaVersion:2,taskId:task.id,qualified,executedAt:new Date().toISOString(),evaluatorHash:good.result.evaluatorHash,imageId:good.result.isolation.imageId,rawReceipt:{path:receiptPath,sha256:digest(raw)},controls:results.map(r=>({control:r.control,sourceHash:r.sourceHash,receiptHash:r.result.receiptHash,compilePassed:r.result.compilePassed,policyPassed:r.result.policyPassed,hiddenPassed:r.result.hiddenPassed,tests:r.result.tests}))},null,2)+'\n');
  await writeFile(join(path,'public-baseline.json'),JSON.stringify({sourceHash:bad.sourceHash,evaluatorHash:bad.result.evaluatorHash,compilePassed:bad.result.compilePassed,policy:bad.result.policy,diagnostics:bad.result.diagnostics,tests:bad.result.cases.filter(c=>c.visibility==='public').flatMap(c=>c.checks),mode:'executed_original_baseline_only'},null,2)+'\n');
}
