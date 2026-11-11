import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {evaluatorIdentity} from '../packages/evaluation/src/identity';
import {runAnonymous} from '../packages/evaluation/src/blind-runner';
import {canonical,digest} from '../packages/evaluation/src/protocol';
const root=resolve(import.meta.dirname,'..'),evaluator=await evaluatorIdentity(root),results=[];
for(const [taskId,extension] of [['d1-ts-development','ts'],['d1-py-development','py']]){
  const source=await readFile(join(root,`evaluation/corpus/tasks/${taskId}/golden.${extension}`),'utf8');
  const job={candidateId:digest(`control-qualification:${taskId}`).slice(0,40),taskId:taskId!,protocolHash:digest('synthetic_host_boundary_qualification_not_a_study_attempt'),evaluatorHash:evaluator.sha256,sourceHash:digest(source),source};
  const receipt=await runAnonymous(root,job);assert.equal(receipt.result.hiddenPassed,true);results.push({taskId,passed:true,receipt});
  await assert.rejects(runAnonymous(root,{...job,arm:'B'} as typeof job),/exit=1/);
}
const hostBoundaryFiles=await Promise.all(['packages/evaluation/src/blind-runner.ts','scripts/grade-evaluation-candidate.ts'].map(async path=>({path,sha256:digest(await readFile(join(root,path)))})));
const value={schemaVersion:1,source:'local_host_boundary_qualification',studyAttempt:false,evaluatorHash:evaluator.sha256,hostBoundaryFiles,passed:true,unexpectedTreatmentFieldsRejected:true,executedAt:new Date().toISOString(),results};
await writeFile(join(root,'evaluation/qualification/blind-runner.json'),JSON.stringify({...value,receiptHash:digest(canonical(value))},null,2)+'\n');
console.log(JSON.stringify({status:'blind_boundary_qualified',languages:2,unexpectedTreatmentFieldsRejected:true,evaluatorHash:evaluator.sha256}));
