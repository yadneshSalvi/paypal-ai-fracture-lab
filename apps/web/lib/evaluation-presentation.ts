import type {StudyAttempt,StudyReport} from '../../../packages/contracts/src/evaluation-study';

export const studyArms=['A','B','C'] as const;
export const armNames={A:'No added context',B:'APIMatic skills',C:'Raw REST reference'};
export const armColors={A:'#9eafc6',B:'#b49bff',C:'#67dcc6'};
export const familyNames:Record<string,string>={D1:'One purchase, one charge',D2:'Recover the missing answer',D3:'Events without duplicate effects',D4:'Refunds with durable identity',D5:'Safe agent retries'};
export type Outcome='passed'|'invariant'|'compilation'|'policy'|'submission'|'infrastructure';
export const outcomeNames:Record<Outcome,string>={passed:'Passed',invariant:'Invariant failed',compilation:'Compilation failed',policy:'Policy rejected',submission:'No valid submission',infrastructure:'Infrastructure'};
export function attemptOutcome(row:StudyAttempt):Outcome{
  if(row.status==='infrastructure_failure')return 'infrastructure';
  if(row.status==='submission_failure')return 'submission';
  if(!row.compilePassed)return 'compilation';
  if(!row.policyPassed)return 'policy';
  return row.passed?'passed':'invariant';
}
export function percent(value:number|null,digits=0){return value===null?'—':`${(100*value).toFixed(digits)}%`;}
export function points(value:number|null){return value===null?'—':`${value>0?'+':''}${(value*100).toFixed(1)} pp`;}
export function count(value:number){return new Intl.NumberFormat('en-US').format(value);}
export function cost(value:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<.01?4:2}).format(value);}
export function elapsed(value:number){if(value<60000)return `${(value/1000).toFixed(1)}s`;return `${Math.floor(value/60000)}m ${Math.round(value%60000/1000)}s`;}
export function shortHash(value:string|null,size=10){return value?`${value.slice(0,size)}…`: 'Unavailable';}
export interface AttemptFilters {model:string;language:string;split:string;arm:string;outcome:string;task:string;query:string}
export const emptyAttemptFilters:AttemptFilters={model:'all',language:'all',split:'all',arm:'all',outcome:'all',task:'all',query:''};
export function filterAttempts(rows:StudyAttempt[],filters:AttemptFilters){
  const query=filters.query.trim().toLocaleLowerCase();
  return rows.filter(row=>(filters.model==='all'||row.model===filters.model)&&(filters.language==='all'||row.language===filters.language)&&(filters.split==='all'||row.split===filters.split)&&(filters.arm==='all'||row.arm===filters.arm)&&(filters.task==='all'||row.taskId===filters.task)&&(filters.outcome==='all'||(filters.outcome==='failed'?row.passed===false:attemptOutcome(row)===filters.outcome))&&(!query||`${row.title} ${row.taskId} ${row.candidateId}`.toLocaleLowerCase().includes(query)));
}
export function stratumFor(report:StudyReport,model:string,language:string,split:string){return report.strata.find(stratum=>stratum.model===model&&stratum.language===language&&stratum.split===split)??null;}
export function attemptsCsv(rows:StudyAttempt[]){
  const columns=['candidate_id','task_id','model','language','split','arm','repeat','outcome','passed','compile_passed','policy_passed','hidden_passed','attempt_records','final_generation_tokens','duration_ms','final_generation_estimated_usd','unpriced_calls','provider_receipt_hash','runner_receipt_hash'];
  const cell=(value:unknown)=>{const text=String(value??'');return `"${(/^[=+@-]/.test(text)?`'${text}`:text).replaceAll('"','""')}"`;};
  return [columns,...rows.map(row=>[row.candidateId,row.taskId,row.model,row.language,row.split,row.arm,row.repeat,attemptOutcome(row),row.passed,row.compilePassed,row.policyPassed,row.hiddenPassed,row.history.length,row.totalTokens,row.durationMs,row.estimatedCostUsd,row.unpricedCalls,row.providerReceiptHash,row.runnerReceiptHash])].map(values=>values.map(cell).join(',')).join('\r\n');
}
