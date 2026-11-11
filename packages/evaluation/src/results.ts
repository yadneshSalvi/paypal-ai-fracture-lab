import {z} from 'zod';
import {canonical,digest,type Protocol} from './protocol';
import {assignments} from './schedule';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
/** Treatment labels never enter the grader's record. Analysis joins them only after result freeze. */
export const gradeSchema=z.object({schemaVersion:z.literal(1),candidateId:z.string().regex(/^[a-f0-9]{40}$/),taskId:z.string(),protocolHash:hash,
  sourceHash:hash.nullable(),graderHash:hash,stage:z.enum(['graded','infrastructure_failure']),compilePassed:z.boolean().nullable(),policyPassed:z.boolean().nullable(),hiddenPassed:z.boolean().nullable(),
  tests:z.array(z.object({id:z.string(),passed:z.boolean()}).strict()),tokens:z.number().int().nonnegative(),durationMs:z.number().nonnegative(),
  providerReceiptHash:hash.nullable(),runnerReceiptHash:hash.nullable(),errorCode:z.string().nullable(),retryOf:z.string().nullable(),
  attemptNumber:z.number().int().min(1).max(2),finishedAt:z.iso.datetime()}).strict();
export type Grade=z.infer<typeof gradeSchema>;
export function validateGrades(p:Protocol,input:unknown[]){
  const rows=assignments(p),index=new Map(rows.map(r=>[r.candidateId,r])),protocolHash=digest(canonical(p));
  const groups=new Map<string,Grade[]>();
  for(const raw of input){const g=gradeSchema.parse(raw),a=index.get(g.candidateId);
    if(!a||a.taskId!==g.taskId||g.protocolHash!==protocolHash)throw new Error('Grade does not belong to this frozen protocol.');
    if(g.graderHash!==digest(canonical(p.evaluatorFiles)))throw new Error('Grade uses a different frozen evaluator.');
    if(g.stage==='graded'&&(!g.sourceHash||g.compilePassed===null||g.policyPassed===null||g.hiddenPassed===null||!g.providerReceiptHash||!g.runnerReceiptHash||g.errorCode))throw new Error('A graded result requires actual model and runner receipts and all three verdicts.');
    if(new Set(g.tests.map(t=>t.id)).size!==g.tests.length)throw new Error('Repeated test identifiers cannot inflate a grade.');
    if(g.hiddenPassed===true&&(!g.tests.length||g.tests.some(t=>!t.passed)))throw new Error('Passing hidden verdict requires nonempty, passing test records.');
    if(g.stage==='infrastructure_failure'&&(g.compilePassed!==null||g.policyPassed!==null||g.hiddenPassed!==null||g.tests.length||!g.errorCode))throw new Error('Infrastructure failures cannot be assigned a target verdict.');
    const group=groups.get(g.candidateId)??[];if(group.some(x=>x.attemptNumber===g.attemptNumber))throw new Error('A candidate attempt cannot be replaced or selectively duplicated.');group.push(g);groups.set(g.candidateId,group);
  }
  for(const group of groups.values()){group.sort((a,b)=>a.attemptNumber-b.attemptNumber);const first=group[0]!;
    if(first.attemptNumber!==1||first.retryOf!==null)throw new Error('Every candidate needs its retained first attempt.');
    if(group.length>1){const second=group[1]!;if(first.stage!=='infrastructure_failure'||!p.infrastructureRetry.retryable.includes(first.errorCode as typeof p.infrastructureRetry.retryable[number])||second.retryOf!==digest(canonical(first)))throw new Error('Only a predeclared infrastructure failure permits one linked retry.');
      if(first.finishedAt>second.finishedAt)throw new Error('Retry cannot predate its retained first attempt.');
      if(first.sourceHash&&(first.sourceHash!==second.sourceHash||first.providerReceiptHash!==second.providerReceiptHash))throw new Error('A runner retry must grade the same original model submission.');
    }
  }
  return rows.map(a=>{const history=groups.get(a.candidateId)??[];const g=history.at(-1)??null;return {...a,history,grade:g,passed:g?.stage==='graded'?Boolean(g.compilePassed&&g.policyPassed&&g.hiddenPassed):null};});
}
const quantile=(sorted:number[],q:number)=>{const n=(sorted.length-1)*q,lo=Math.floor(n),hi=Math.ceil(n);return sorted[lo]!+(sorted[hi]!-sorted[lo]!)*(n-lo);};
function random(seed:string){let x=Number.parseInt(digest(seed).slice(0,8),16)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
/** Resample task clusters; repetitions are never counted as independent subjects. */
export function pairedInterval(taskDifferences:number[],seed:string,resamples=10000,alpha=.05){
  if(taskDifferences.length<2)return null;
  const rng=random(seed),draws:number[]=[];
  for(let i=0;i<resamples;i++){let sum=0;for(let j=0;j<taskDifferences.length;j++)sum+=taskDifferences[Math.floor(rng()*taskDifferences.length)]!;draws.push(sum/taskDifferences.length);}
  draws.sort((a,b)=>a-b);return {estimate:taskDifferences.reduce((s,x)=>s+x,0)/taskDifferences.length,low:quantile(draws,alpha/2),high:quantile(draws,1-alpha/2),clusters:taskDifferences.length,resamples};
}
export function summarize(p:Protocol,input:unknown[]){
  const rows=validateGrades(p,input),strata=[];
  for(const model of p.models)for(const language of ['TypeScript','Python'])for(const split of ['development','held_out'] as const){
    const selected=rows.filter(r=>r.modelId===model.id&&r.language===language&&r.split===split);
    const byArm=['A','B','C'].map(arm=>{const a=selected.filter(r=>r.arm===arm),graded=a.filter(r=>r.passed!==null),passed=graded.filter(r=>r.passed).length;return {arm,planned:a.length,graded:graded.length,passed,failed:graded.length-passed,infrastructureFailures:a.filter(r=>r.grade?.stage==='infrastructure_failure').length,missing:a.filter(r=>!r.grade).length,passRate:graded.length?passed/graded.length:null};});
    const complete=selected.every(r=>r.passed!==null);
    const comparisons=['A','C'].map(other=>{const dots=p.tasks.filter(t=>t.language===language&&t.split===split).map(task=>{const forArm=(arm:string)=>selected.filter(r=>r.taskId===task.id&&r.arm===arm);const b=forArm('B'),a=forArm(other);const valid=[...a,...b].every(r=>r.passed!==null);return {taskId:task.id,nPerArm:p.repeats,difference:valid?(b.filter(r=>r.passed).length-a.filter(r=>r.passed).length)/p.repeats:null};});
      const d=dots.map(x=>x.difference).filter((x):x is number=>x!==null),seed=`${p.statistics.seed}:${model.id}:${language}:${split}:${other}`;
      // Missing outcomes are visible and never silently removed to improve an interval.
      return {comparison:`B-${other}`,dots,interval95:complete?pairedInterval(d,seed,p.statistics.resamples):null,familywiseInterval:complete?pairedInterval(d,seed,p.statistics.resamples,p.statistics.familywiseAlpha/2):null,intervalStatus:complete?'complete_stratum':'withheld_incomplete_stratum'};
    });
    strata.push({model:model.id,language,split,arms:byArm,comparisons});
  }
  return {schemaVersion:1,protocolHash:digest(canonical(p)),planned:rows.length,heldOutPlanned:rows.filter(r=>r.split==='held_out').length,graded:rows.filter(r=>r.passed!==null).length,
    infrastructureFailures:rows.filter(r=>r.grade?.stage==='infrastructure_failure').length,missing:rows.filter(r=>!r.grade).length,retries:rows.reduce((s,r)=>s+Math.max(0,r.history.length-1),0),
    resultHash:digest(canonical([...input].sort((a,b)=>canonical(a).localeCompare(canonical(b))))),strata,
    limitations:[...p.limitations,'First-submission outcomes include compilation and policy checks. Infrastructure failures remain separate.','Models and protocol authors are not fully blinded. The grading record omits treatment labels.','Intervals are computed within model, language and split; each resampling unit is one task. Five tasks per stratum yield limited precision.','Pointwise 95% intervals and Bonferroni 97.5% intervals for the two predeclared comparisons are reported separately; no cross-stratum familywise claim.']};
}
