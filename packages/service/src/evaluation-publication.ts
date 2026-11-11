import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {canonical,digest,parseProtocol} from '../../evaluation/src/protocol';
import {summarize,validateGrades} from '../../evaluation/src/results';
import type {CandidateEvidence,StudyPublication,StudyReport,StudyTask,StudyTaskEvidence} from '../../contracts/src/evaluation-study';
import type {EvaluationDTO} from '@fracture/contracts';
import {workspaceRoot} from './config';

export const publishedStudyId='fracture-context-2026-11-v1';
const read=async(path:string)=>JSON.parse(await readFile(path,'utf8')) as Record<string,any>;
async function optional(path:string){try{return await read(path);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
let cached:{key:string;publication:StudyPublication}|undefined;

/** Public research reads have no database mutation or provider execution capability. */
export async function readStudyPublication(root=workspaceRoot()):Promise<StudyPublication>{
  const directory=join(root,'evaluation/studies',publishedStudyId),progressPath=join(root,'.artifacts/evaluation-studies',publishedStudyId,'progress.json');
  const names=['protocol.json','freeze.json','qualification.json','report.json','seal.json','grades.anonymous.json'];
  const stamps=await Promise.all(names.map(async name=>{try{const value=await stat(join(directory,name));return `${name}:${value.mtimeMs}:${value.size}`;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return `${name}:absent`;throw error;}}));
  const key=`${root}:${stamps.join('|')}`;
  let publication:StudyPublication;
  if(cached?.key===key)publication=cached.publication;
  else {
    const [protocolText,frozen,qualification,reportValue,seal,grades]=await Promise.all([readFile(join(directory,'protocol.json'),'utf8'),read(join(directory,'freeze.json')),read(join(directory,'qualification.json')),optional(join(directory,'report.json')),optional(join(directory,'seal.json')),optional(join(directory,'grades.anonymous.json'))]);
    const p=parseProtocol(JSON.parse(protocolText)),protocolHash=digest(canonical(p));
    if(p.id!==publishedStudyId||frozen.protocolHash!==protocolHash||digest(protocolText)!==frozen.protocolFileHash||qualification.evaluatorHash!==frozen.evaluatorHash||qualification.imageId!==frozen.imageId)throw new Error('The public study freeze does not match its source receipts.');
    const tasks=qualification.tasks as StudyTask[];
    if(!Array.isArray(tasks)||tasks.length!==p.tasks.length||new Set(tasks.map(task=>task.taskId)).size!==p.tasks.length)throw new Error('The public task catalog differs from its frozen corpus.');
    for(const task of tasks){const original=p.tasks.find(item=>item.id===task.taskId);if(!original||task.family!==original.family||task.language!==original.language||task.split!==original.split||task.baselineHash!==original.baselineSource.sha256||task.goldenHash!==original.hardenedSource.sha256||canonical(task.controlProof)!==canonical(original.controlProof)||task.qualified!==true||!Number.isInteger(task.checks)||task.checks<1)throw new Error('A public task differs from its frozen source identity.');}
    let report:StudyReport|null=null;
    if(reportValue){
      report=reportValue as StudyReport;
      if(!seal||!Array.isArray(grades)||report.status!=='sealed'||report.id!==p.id||report.protocolHash!==protocolHash||seal.protocolHash!==protocolHash||digest(canonical(seal))!==report.sealHash||digest(canonical(grades))!==seal.gradesHash||report.resultHash!==digest(canonical([...grades].sort((a,b)=>canonical(a).localeCompare(canonical(b)))))||report.rows.length!==600||new Set(report.rows.map(r=>r.candidateId)).size!==600)throw new Error('The published result is missing its complete, matching anonymous seal.');
      if(seal.studyId!==p.id||seal.schemaVersion!==1||seal.sealedAt!==report.sealedAt||!Array.isArray(seal.files)||digest(canonical(seal.files))!==seal.fileManifestHash||canonical(seal.counts)!==canonical(report.receiptCounts)||report.receiptCounts.recordedCandidates!==600||report.receiptCounts.missing!==0||report.dataScope!=='executed_model_offline_sdk'||report.livePaymentOperations!==0||report.sourceCommit!==frozen.sourceCommit||report.evaluatorHash!==frozen.evaluatorHash||report.imageId!==frozen.imageId||canonical(report.models)!==canonical(p.models)||canonical(report.contexts)!==canonical(p.contexts)||canonical(report.tasks)!==canonical(tasks)||canonical(report.execution)!==canonical(p.execution)||report.maximumOutputTokens!==p.maximumOutputTokens||canonical(report.statistics)!==canonical(p.statistics))throw new Error('The published study metadata differs from its frozen protocol and complete seal.');
      const reproduced=summarize(p,grades);for(const [name,value] of Object.entries(reproduced))if(canonical(value)!==canonical(reportValue[name]))throw new Error('The published analysis differs from its sealed grades.');
      const joined=new Map(validateGrades(p,grades).map(row=>[row.candidateId,row]));
      for(const row of report.rows){const original=joined.get(row.candidateId);if(!original?.grade||original.taskId!==row.taskId||original.modelId!==row.model||original.arm!==row.arm||original.repeat!==row.repeat||original.split!==row.split||original.language!==row.language||original.passed!==row.passed||original.grade.stage!==row.status||original.grade.compilePassed!==row.compilePassed||original.grade.policyPassed!==row.policyPassed||original.grade.hiddenPassed!==row.hiddenPassed||original.grade.tokens!==row.totalTokens||original.grade.durationMs!==row.durationMs||canonical(original.history)!==canonical(row.history)||canonical(original.grade.tests)!==canonical(row.tests))throw new Error('An attempt display differs from its original sealed outcome.');}
      for(const row of report.rows){const original=joined.get(row.candidateId)!,grade=original.grade!,task=tasks.find(item=>item.taskId===row.taskId)!;if(row.title!==task.title||row.family!==original.family||row.sourceHash!==grade.sourceHash||row.providerReceiptHash!==grade.providerReceiptHash||row.runnerReceiptHash!==grade.runnerReceiptHash||row.errorCode!==grade.errorCode||row.attemptNumber!==grade.attemptNumber||row.evidencePath!==`candidates/${row.candidateId}.json.gz`)throw new Error('An attempt identity or evidence link differs from its sealed history.');}
    }
    publication={id:p.id,phase:report?'sealed':'protocol_frozen',protocolHash,sourceCommit:String(frozen.sourceCommit),evaluatorHash:String(frozen.evaluatorHash),imageId:String(frozen.imageId),frozenAt:String(frozen.frozenAt),updatedAt:report?.sealedAt??String(frozen.frozenAt),planned:600,heldOutPlanned:300,recordedCandidates:report?.receiptCounts.recordedCandidates??0,gradedCandidates:report?.graded??0,infrastructureCandidates:report?.infrastructureFailures??0,models:p.models,contexts:p.contexts,tasks,execution:p.execution,maximumOutputTokens:p.maximumOutputTokens,statistics:p.statistics,limitations:report?.limitations??p.limitations,artifactBase:`/evaluations/${p.id}`,report,qualification:{hardenedControls:tasks.length,faultyControls:tasks.length,invariantChecks:tasks.reduce((sum,task)=>sum+task.checks,0),safetyProbes:11,anonymousLanguages:2}};
    cached={key,publication};
  }
  if(publication.report)return publication;
  // Deliberately copy counts only. No assignments, candidate IDs or outcomes are exposed before seal.
  const progress=await optional(progressPath);
  if(!progress)return publication;
  const counts=['recordedCandidates','gradedCandidates','infrastructureCandidates'] as const;
  if(progress.studyId!==publication.id||progress.protocolHash!==publication.protocolHash||counts.some(name=>!Number.isInteger(progress[name])||progress[name]<0||progress[name]>600)||progress.gradedCandidates+progress.infrastructureCandidates!==progress.recordedCandidates)throw new Error('Study progress is inconsistent with the frozen schedule.');
  return {...publication,phase:'running',updatedAt:String(progress.updatedAt),recordedCandidates:progress.recordedCandidates,gradedCandidates:progress.gradedCandidates,infrastructureCandidates:progress.infrastructureCandidates};
}

export function publicationToEvaluation(publication:StudyPublication):EvaluationDTO{
    return {id:publication.id,title:'Does better context change the outcome?',status:publication.phase==='sealed'?'completed':publication.phase,protocolHash:publication.protocolHash,plannedAttempts:600,completedAttempts:publication.recordedCandidates,heldOutAttempts:300,families:['Multi-order customer-intent duplication','Lost-write-response reconciliation','Duplicate/out-of-order webhook effects','Refund concurrency and request identity','Agent-tool retry identity and error classification'],arms:[{id:'A',name:'No added context',description:'Task, faulty source and ordinary SDK types; no added API reference bundle.'},{id:'B',name:'APIMatic skills',description:'Frozen integration skills and selected SDK operation maps.'},{id:'C',name:'Raw REST reference',description:'Official PayPal REST documentation within 1% of B’s provider-tokenized budget.'}],models:publication.models.map(model=>model.id),attempts:publication.report?.rows.map(row=>({id:row.candidateId,taskId:row.taskId,language:row.language,model:row.model,arm:row.arm,repeat:row.repeat,heldOut:row.split==='held_out',passed:row.passed,status:row.status==='infrastructure_failure'?'infrastructure_failure':'completed',tokens:row.totalTokens,latencyMs:row.durationMs,source:'sample',evidenceId:null}))??[],limitations:publication.limitations};
}

export async function readCandidateEvidence(candidateId:string,root=workspaceRoot()):Promise<CandidateEvidence>{
  if(!/^[a-f0-9]{40}$/.test(candidateId))throw new Error('Invalid candidate identifier.');
  const study=await readStudyPublication(root),row=study.report?.rows.find(item=>item.candidateId===candidateId);
  if(!row)throw new Error('Candidate evidence is available only for an original candidate in a sealed study.');
  const path=join(root,'apps/web/public/evaluations',study.id,'candidates',`${candidateId}.json.gz`),bytes=await readFile(path);
  const evidence=JSON.parse(gunzipSync(bytes,{maxOutputLength:16000000}).toString('utf8')) as CandidateEvidence;
  if(evidence.candidateId!==candidateId||evidence.taskId!==row.taskId||evidence.protocolHash!==study.protocolHash||evidence.studyId!==study.id||evidence.dataScope!=='executed_model_offline_sdk'||evidence.privateReasoningIncluded!==false||canonical(evidence.history.map(h=>h.grade))!==canonical(row.history))throw new Error('Candidate evidence does not match its sealed history.');
  for(const attempt of evidence.history){const {receiptHash,...body}=attempt.generation;if(digest(canonical(body))!==receiptHash||receiptHash!==attempt.grade.providerReceiptHash)throw new Error('Candidate generation receipt changed.');if(attempt.runner){const {receiptHash:hash,...runner}=attempt.runner;if(digest(canonical(runner))!==hash||hash!==attempt.grade.runnerReceiptHash)throw new Error('Candidate runner receipt changed.');}}
  return evidence;
}

export async function readTaskEvidence(taskId:string,root=workspaceRoot()):Promise<StudyTaskEvidence>{
  const publication=await readStudyPublication(root),task=publication.tasks.find(item=>item.taskId===taskId);
  if(!task)throw new Error('This task is not in the frozen corpus.');
  const p=parseProtocol(await read(join(root,'evaluation/studies',publishedStudyId,'protocol.json'))),frozenTask=p.tasks.find(item=>item.id===taskId)!;
  const load=async(file:{path:string;sha256:string})=>{const text=await readFile(join(root,file.path),'utf8');if(digest(text)!==file.sha256)throw new Error('The task source differs from its frozen hash.');return text;};
  const [prompt,baseline]=await Promise.all([load(frozenTask.prompt),load(frozenTask.baselineSource)]);
  const controls:StudyTaskEvidence['controls']=[];let golden:string|null=null;
  if(publication.report){
    golden=await load(frozenTask.hardenedSource);const proof=JSON.parse(await load(frozenTask.controlProof)),bytes=await readFile(join(root,proof.rawReceipt.path));
    if(digest(bytes)!==proof.rawReceipt.sha256)throw new Error('The task qualification receipt changed.');
    const executed=JSON.parse(gunzipSync(bytes,{maxOutputLength:16000000}).toString('utf8')) as Array<Record<string,any>>;
    for(const record of executed){const {receiptHash,...result}=record.result;if(digest(canonical(result))!==receiptHash)throw new Error('A control execution receipt changed.');controls.push({control:record.control,sourceHash:record.sourceHash,compilePassed:result.compilePassed,policyPassed:result.policyPassed,hiddenPassed:result.hiddenPassed,checks:result.tests,receiptHash});}
  }
  return {task,protocolHash:publication.protocolHash,prompt,baseline,golden,controls,hiddenChecksReleased:Boolean(publication.report)};
}
