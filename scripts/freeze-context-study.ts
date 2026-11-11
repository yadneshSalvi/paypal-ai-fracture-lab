import {readFile,mkdir} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseProtocol,verifyProtocolFiles,canonical,digest} from '../packages/evaluation/src/protocol';
import {assignments,graderAssignment} from '../packages/evaluation/src/schedule';
import {evaluatorPaths} from '../packages/evaluation/src/identity';
import {qualifyCorpus,qualifiedProviderBindings} from '../packages/evaluation/src/preflight';
import {readJson,saveNew,verifyReceipt,recursiveFiles} from '../packages/evaluation/src/artifacts';

const root=resolve(import.meta.dirname,'..'),id='fracture-context-2026-11-v1',publicDir=join(root,'evaluation/studies',id),privateDir=join(root,'.artifacts/evaluation-studies',id);
const qualification=await qualifyCorpus(root),bindings=await qualifiedProviderBindings(root),types=await readJson(join(root,'evaluation/types/provenance.json')),availability=await readJson(join(root,'evaluation/provider-qualification/availability.json'));
async function file(path:string){return {path,sha256:digest(await readFile(join(root,path)))};}
const contexts=[];
for(const provider of ['openai','gemini'])for(const language of ['typescript','python']){
  const path=`evaluation/contexts/tokenization/${provider}-${language}.json`,receipt=verifyReceipt(await readJson(join(root,path)));
  for(const arm of ['B','C'])if(digest(await readFile(join(root,receipt[arm].path)))!==receipt[arm].sha256)throw new Error('Token-counted context changed.');
  if(!receipt.C.allSixOperationBlocksPresent)throw new Error('Raw REST context does not cover every required operation.');
  contexts.push({modelId:receipt.model,language:language==='typescript'?'TypeScript':'Python',tokenizer:receipt.tokenizer,tokenizationReceipt:await file(path),tokenBudget:receipt.tokenBudget,B:{files:[await file(receipt.B.path)],tokens:receipt.B.tokens},C:{files:[await file(receipt.C.path)],tokens:receipt.C.tokens}});
}
const tasks=[];
for(const task of qualification.tasks){
  const language=task.language==='TypeScript'?'typescript':'python',extension=language==='typescript'?'ts':'py',directory=`evaluation/corpus/tasks/${task.taskId}`;
  const proof=await readJson(join(root,directory,'control-proof.json'));
  const accessibleFiles=await Promise.all([`${directory}/baseline.${extension}`,`${directory}/public-baseline.json`,'evaluation/corpus/shared/WORKSPACE.md',`evaluation/corpus/shared/api.${extension}`,'evaluation/types/LICENSE.txt',...types.records.filter((f:Record<string,string>)=>f.path!.startsWith(`evaluation/types/${language}/`)).map((f:Record<string,string>)=>f.path)].map(path=>file(path)));
  tasks.push({id:task.taskId,family:task.family,language:task.language,split:task.split,prompt:await file(`${directory}/prompt.md`),accessibleFiles,hiddenTests:await Promise.all(['packages/evaluation/src/cases.ts','packages/evaluation/src/world.ts',proof.rawReceipt.path].map(file)),controlProof:await file(`${directory}/control-proof.json`),baselineSource:await file(`${directory}/baseline.${extension}`),hardenedSource:await file(`${directory}/golden.${extension}`)});
}
const additionalFiles=['package.json','package-lock.json','tsconfig.json','packages/evaluation/src/results.ts','packages/evaluation/src/schedule.ts','packages/evaluation/src/artifacts.ts','packages/evaluation/src/provider-http.ts','packages/evaluation/src/gateway.ts','packages/evaluation/src/model-workspace.ts','packages/evaluation/src/blind-runner.ts','packages/evaluation/src/preflight.ts','packages/evaluation/src/study.ts','packages/evaluation/src/study-integrity.ts','scripts/grade-evaluation-candidate.ts','scripts/run-context-study.ts','scripts/seal-context-study.ts','scripts/freeze-context-study.ts','scripts/prepare-evaluation.ts','scripts/prepare-evaluation-contexts.ts','scripts/project-python-types.py','scripts/tokenize-evaluation-contexts.ts','evaluation/contexts/provenance.json','evaluation/types/provenance.json','evaluation/contexts/licenses/APIMatic-MIT.txt','evaluation/contexts/licenses/PayPal-Apache-2.0.txt','evaluation/provider-qualification/availability.json','evaluation/provider-qualification/settings-and-costs.json','evaluation/qualification/safety.json',...bindings.map(b=>b.path)];
additionalFiles.push('evaluation/README.md','scripts/reproduce-context-report.ts','scripts/evaluate.ts','scripts/qualify-evaluation.ts','scripts/qualify-evaluation-safety.ts','scripts/qualify-evaluation-blind.ts','scripts/qualify-evaluation-providers.ts');
for(const directory of ['evaluation/qualification','evaluation/provider-qualification'])for(const path of await recursiveFiles(join(root,directory)))if(!path.endsWith('.log'))additionalFiles.push(relative(root,path));
const modelRows=availability.results as Array<Record<string,any>>;
const p=parseProtocol({schemaVersion:2,id,createdAt:new Date().toISOString(),tasks,models:[
  {id:'gpt-6.1-sol',provider:'openai',version:`gpt-6.1-sol; provider model created=${modelRows.find(r=>r.provider==='openai')!.model.created}; resolved response model retained`,verifiedAt:modelRows.find(r=>r.provider==='openai')!.checkedAt,settings:{api:'Responses',reasoningEffort:'max',store:false,continuation:'stateless_encrypted_reasoning',serviceTier:'default',temperature:'omitted',seed:'omitted'},honorsSeed:false},
  {id:'gemini-3.8-flash',provider:'gemini',version:`models/gemini-3.8-flash; provider version=${modelRows.find(r=>r.provider==='gemini')!.model.version}; resolved response model retained`,verifiedAt:modelRows.find(r=>r.provider==='gemini')!.checkedAt,settings:{api:'Interactions',apiRevision:'2026-05-20',thinkingLevel:'high',store:true,continuation:'previous_interaction_id',temperature:'omitted',seed:'omitted'},honorsSeed:false},
],repeats:5,seedLabels:['paired-alpha-20261111','paired-bravo-20261111','paired-charlie-20261111','paired-delta-20261111','paired-echo-20261111'],arms:['A','B','C'],contexts,promptTemplate:await file('evaluation/prompt-template.md'),evaluatorFiles:await Promise.all([...new Set([...evaluatorPaths,...additionalFiles])].map(file)),runnerManifest:await file('evaluation/runtime-lock/manifest.json'),maximumOutputTokens:65536,maximumIterations:1,
execution:{maximumToolCalls:24,maximumToolResultCharacters:24000,maximumSourceBytes:120000,providerDeadlineMs:900000,providerConcurrency:4,gradingConcurrency:1,allowedTools:['list_files','read_file','search_files','inspect_baseline'],outputBudgetAccounting:'cumulative_provider_output_including_reasoning',accessPolicy:'explicit_frozen_files_only',firstSubmission:'one_final_source_no_edited_draft_execution'},
infrastructureRetry:{maximumRetries:1,retryable:['provider_429','provider_5xx','transport_before_response','runner_unavailable']},statistics:{resamples:10000,seed:'fracture-task-cluster-bootstrap-20261111',cluster:'task',comparisons:['B-A','B-C'],familywiseAlpha:.05,intervalMethod:'percentile_task_cluster_bootstrap',multiplicity:'bonferroni_two_comparisons'},limitations:[
  'These are independently authored controlled integration tasks using actual pinned SDKs and deterministic offline provider fixtures. They do not add live payment evidence or prove universal PayPal behavior.',
  'The project corpus was authored with AI assistance; its authors saw both splits. Held-out tasks are excluded from study prompt tuning after freeze. This is not an independently curated external benchmark.',
  'Five task families, two languages, two provider families, five repeats and three arms yield 600 original assignments, including 300 held-out assignments. No settled PayPal experiment is rerun.',
  'Both providers use their highest selected reasoning setting and the same cumulative 65,536 output-token and 24 read-tool limits. Reasoning labels and provider tokenizers are not numerically equivalent across model families.',
  'Provider model IDs are frozen, but hosted model weights are not under laboratory control. Availability responses and every reported model identifier are retained. Seed labels define matched ordering blocks; provider seeds are not sent or claimed deterministic.',
  'A has no added natural-language API bundle. All arms receive the same task, baseline, workspace contract, public baseline receipt, and mechanically stripped ordinary SDK type declarations. Types necessarily convey API information.',
  'B contains the declared APIMatic skills and selected operation-map blocks. C contains six complete raw official REST operation blocks, then referenced schemas in the frozen breadth-first prefix order. The final schema may be truncated. Provider-counted bundle budgets differ by at most 1%.',
  'At most four generation jobs run concurrently, with two fixed workers per provider and one isolated grader. Arm order is pseudorandomized within matched task/model/repeat blocks; runtime concurrency can overlap adjacent blocks.',
  'One retry is allowed only after a recorded 429, 5xx, proven pre-response connection failure, or unavailable runner, with a fixed 30-second delay. A runner retry uses exactly the original generated source and provider receipt. All first failures remain in history.',
  'Unknown transport outcomes and interrupted in-flight generation are retained without redispatch. Invalid, absent, over-budget or incomplete final source is a failed first submission, not an infrastructure retry.',
  'The automated grading worker receives only an anonymous candidate ID, task ID, source and frozen hashes. It does not receive treatment/model assignments or provider credentials. Protocol authors and the source-producing models are not fully blinded; source text may reveal documentation style.',
  'Assignments are joined to outcomes only after an immutable result seal. Every candidate, failure, request receipt, permitted retry and missing outcome remains in the denominator. Incomplete strata have no comparative intervals.',
  'Cost figures are published-rate estimates based on reported usage, not provider invoices. Unknown charges and unpriced failed calls are shown separately. Private reasoning is not published; opaque continuation data stays private.',
]});
const verified=await verifyProtocolFiles(root,p),sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
await mkdir(join(root,'evaluation/studies'),{recursive:true});await mkdir(publicDir,{recursive:false});
await mkdir(join(root,'.artifacts/evaluation-studies'),{recursive:true});await mkdir(privateDir,{recursive:false,mode:0o700});
const frozen={...verified,sourceCommit,evaluatorHash:qualification.evaluatorHash,imageId:qualification.imageId,frozenAt:new Date().toISOString(),status:'protocol_frozen',executedAttempts:0,protocolFileHash:digest(JSON.stringify(p,null,2)+'\n')};
await saveNew(join(publicDir,'protocol.json'),p);await saveNew(join(publicDir,'freeze.json'),frozen);await saveNew(join(publicDir,'qualification.json'),qualification);
await saveNew(join(privateDir,'protocol.json'),p);await saveNew(join(privateDir,'freeze.json'),frozen);await saveNew(join(privateDir,'assignments.private.json'),assignments(p));await saveNew(join(privateDir,'grader-queue.json'),assignments(p).map(graderAssignment));
console.log(JSON.stringify({...frozen,publicDirectory:publicDir,privateDirectory:privateDir}));
