import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {verifyReceipt} from './artifacts';
import {digest} from './protocol';

export interface AnonymousJob {candidateId:string;taskId:string;protocolHash:string;evaluatorHash:string;sourceHash:string;source:string}
export async function runAnonymous(root:string,job:AnonymousJob):Promise<Record<string,any>>{
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--import','tsx',join(root,'scripts/grade-evaluation-candidate.ts')],{cwd:root,env:{NODE_ENV:'production',PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',DOCKER_CONFIG:process.env.DOCKER_CONFIG??join(homedir(),'.docker')},stdio:['pipe','pipe','pipe']});
    let output='',stderr='',done=false;
    const finish=(error?:Error,value?:Record<string,any>)=>{if(done)return;done=true;clearTimeout(timer);if(error)reject(error);else resolve(value!);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new Error('Anonymous grader exceeded its bounded host deadline.'));},220000);
    child.stdout.on('data',chunk=>{output+=chunk.toString();if(Buffer.byteLength(output)>12000000){child.kill('SIGKILL');finish(new Error('Anonymous grader output exceeded its limit.'));}});
    child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(stderr.length>20000)stderr=stderr.slice(-20000);});
    child.on('error',()=>finish(new Error('Anonymous grader process unavailable.')));
    child.on('close',code=>{if(done)return;if(code!==0){finish(new Error(`Anonymous grader exit=${code}; stderrSha256=${digest(stderr)}; stdoutSha256=${digest(output)}`));return;}try{
      const receipt=verifyReceipt(JSON.parse(output) as Record<string,any>);
      if(receipt.candidateId!==job.candidateId||receipt.taskId!==job.taskId||receipt.sourceHash!==job.sourceHash||receipt.protocolHash!==job.protocolHash||receipt.evaluatorHash!==job.evaluatorHash)throw new Error('Anonymous receipt binding mismatch.');
      if(receipt.kind==='anonymous_executed_grade')verifyReceipt(receipt.result);
      else if(receipt.kind!=='anonymous_runner_failure')throw new Error('Unknown anonymous receipt.');
      finish(undefined,receipt);
    }catch(error){finish(error instanceof Error?error:new Error('Invalid anonymous receipt.'));}});
    child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(job));
  });
}
