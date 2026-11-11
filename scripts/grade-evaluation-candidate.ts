import {resolve} from 'node:path';
import {z} from 'zod';
import {gradeSource} from '../packages/evaluation/src/grader';
import {evaluatorIdentity} from '../packages/evaluation/src/identity';
import {digest,canonical} from '../packages/evaluation/src/protocol';
import {InfrastructureFailure} from '../packages/evaluation/src/isolation';

// This process receives no treatment assignment, model name, provider response,
// API credentials, host environment copy, or hidden-test results from a model.
const input=z.object({candidateId:z.string().regex(/^[a-f0-9]{40}$/),taskId:z.string(),protocolHash:z.string().regex(/^[a-f0-9]{64}$/),evaluatorHash:z.string().regex(/^[a-f0-9]{64}$/),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),source:z.string().max(120000)}).strict();
let text='';for await(const chunk of process.stdin){text+=String(chunk);if(Buffer.byteLength(text)>300000)throw new Error('Anonymous grading frame is too large.');}
const job=input.parse(JSON.parse(text)),root=resolve(import.meta.dirname,'..');
if(digest(job.source)!==job.sourceHash)throw new Error('Anonymous source hash mismatch.');
const evaluator=await evaluatorIdentity(root);if(evaluator.sha256!==job.evaluatorHash)throw new Error('Frozen evaluator changed.');
try{
  const result=await gradeSource(root,job.taskId,job.source);
  const receipt={schemaVersion:1,kind:'anonymous_executed_grade',candidateId:job.candidateId,taskId:job.taskId,protocolHash:job.protocolHash,evaluatorHash:job.evaluatorHash,sourceHash:job.sourceHash,result};
  process.stdout.write(JSON.stringify({...receipt,receiptHash:digest(canonical(receipt))})+'\n');
}catch(error){
  if(!(error instanceof InfrastructureFailure))throw error;
  const receipt={schemaVersion:1,kind:'anonymous_runner_failure',candidateId:job.candidateId,taskId:job.taskId,protocolHash:job.protocolHash,evaluatorHash:job.evaluatorHash,sourceHash:job.sourceHash,errorCode:error.code,finishedAt:new Date().toISOString()};
  process.stdout.write(JSON.stringify({...receipt,receiptHash:digest(canonical(receipt))})+'\n');
}
