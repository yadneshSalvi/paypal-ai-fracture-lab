import {join} from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
import {canonical,digest,type Protocol} from './protocol';
import {readJson,optionalJson,verifyReceipt} from './artifacts';
import {readGeneration,readGrades} from './study';
import {providerUsage,estimateCost,type Generation} from './gateway';
import type {Grade} from './results';
import {assignments,graderAssignment} from './schedule';

function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
/** Verifies anonymous histories before any treatment/outcome table is created. */
export async function verifyStudyReceipts(root:string,directory:string,p:Protocol,frozen:Record<string,any>){
  const queue=await readJson<Array<{candidateId:string;taskId:string}>>(join(directory,'grader-queue.json'));
  assert(queue.length===600&&new Set(queue.map(q=>q.candidateId)).size===600,'The anonymous schedule must retain all 600 original candidates.');
  assert(canonical(queue)===canonical(assignments(p).map(graderAssignment)),'The anonymous schedule differs from the original frozen assignments.');
  const grades=await readGrades(directory),lookup=new Map(queue.map(q=>[q.candidateId,q])),groups=new Map<string,Grade[]>(),generationReceipts=new Map<string,Generation>(),startedRecords=new Map<string,Record<string,any>>();
  let providerDispatches=0,unansweredDispatches=0;
  for(const grade of grades){
    assert(lookup.get(grade.candidateId)?.taskId===grade.taskId&&grade.protocolHash===frozen.protocolHash&&grade.graderHash===digest(canonical(p.evaluatorFiles)),'A grade is outside the frozen anonymous schedule.');
    const path=join(directory,'attempts',grade.candidateId,String(grade.attemptNumber)),generation=await readGeneration(directory,grade.candidateId,grade.attemptNumber);
    const started=await readJson(join(path,'started.json'));
    assert(started.candidateId===grade.candidateId&&started.taskId===grade.taskId&&started.protocolHash===grade.protocolHash&&started.attemptNumber===grade.attemptNumber&&started.retryOf===grade.retryOf,'Attempt identity changed after dispatch.');
    assert(Number.isFinite(Date.parse(started.startedAt))&&grade.durationMs===Date.parse(grade.finishedAt)-Date.parse(started.startedAt),'Attempt timing differs from its durable start record.');
    startedRecords.set(`${grade.candidateId}:${grade.attemptNumber}`,started);
    assert(generation.receiptHash===grade.providerReceiptHash&&generation.sourceHash===grade.sourceHash,'A grade changed its model submission.');
    const model=p.models.find(m=>m.id===generation.model);assert(model&&model.provider===generation.provider,'Undeclared provider/model receipt.');
    assert(generation.source===null?generation.sourceHash===null:digest(generation.source)===generation.sourceHash,'Generated source hash mismatch.');
    const originalPath=await optionalJson(join(path,'generation-reference.json'))?join(directory,'attempts',grade.candidateId,'1'):path;
    if(!generationReceipts.has(generation.receiptHash)){
      const callFiles=await readdir(join(originalPath,'calls'));
      const dispatches=callFiles.filter(n=>n.endsWith('-dispatch.json.gz')),responses=callFiles.filter(n=>n.endsWith('-response.json.gz')),accessFiles=callFiles.filter(n=>n.endsWith('-tool.json.gz'));
      assert(dispatches.length>0,'A claimed model attempt has no durable provider dispatch.');
      const unanswered=dispatches.length-generation.calls.length;
      assert(responses.length===generation.calls.length&&accessFiles.length===generation.toolAccesses.length&&callFiles.length===dispatches.length+responses.length+accessFiles.length,'An attempt contains unaccounted or missing request records.');
      assert(unanswered===0||(unanswered===1&&generation.errorCode==='coordinator_interrupted_unknown'),'Unanswered requests require an explicit retained interrupted-generation outcome.');
      assert(dispatches.sort().every((name,index)=>name===`${String(index).padStart(3,'0')}-dispatch.json.gz`),'Provider dispatch sequence changed.');
      providerDispatches+=dispatches.length;unansweredDispatches+=unanswered;
      let input=0,output=0,reasoning=0,total=0,cost=0;
      for(const [i,call] of generation.calls.entries()){
        assert(call.index===i,'Provider request order changed.');
        const stem=String(i).padStart(3,'0'),dispatch=await readJson(join(originalPath,'calls',`${stem}-dispatch.json.gz`)),saved=await readJson(join(originalPath,'calls',`${stem}-response.json.gz`));
        assert(canonical(saved)===canonical(call)&&dispatch.requestHash===call.http.requestHash&&digest(canonical(dispatch.request))===call.http.requestHash,'Provider dispatch or response receipt changed.');
        const request=dispatch.request;
        assert(request.model===generation.model,'Dispatched model differs from the receipt.');
        if(model.provider==='openai')assert(request.store===false&&!request.previous_response_id&&request.reasoning?.effort==='max'&&request.max_output_tokens===p.maximumOutputTokens-output,'OpenAI continuation or budget differs from the frozen settings.');
        else assert(request.store===true&&request.generation_config?.thinking_level==='high'&&request.generation_config.max_output_tokens===p.maximumOutputTokens-output,'Gemini continuation or budget differs from the frozen settings.');
        if(call.usage){const derived=providerUsage(generation.provider,{usage:call.usage.raw});assert(derived&&canonical(derived)===canonical(call.usage),'Provider token accounting changed.');assert(Math.abs(estimateCost(generation.provider,derived)-(call.estimatedCostUsd??-1))<1e-12,'Published-rate cost estimate changed.');input+=derived.inputTokens;output+=derived.outputTokens;reasoning+=derived.reasoningTokens;total+=derived.totalTokens;cost+=call.estimatedCostUsd??0;}
      }
      assert(input===generation.inputTokens&&output===generation.outputTokens&&reasoning===generation.reasoningTokens&&total===generation.totalTokens&&Math.abs(cost-generation.estimatedCostUsd)<1e-10&&generation.unpricedCalls===unanswered+generation.calls.filter(c=>!c.usage).length,'Generation totals differ from request receipts.');
      for(const access of generation.toolAccesses){const saved=await readJson(join(originalPath,'calls',`${String(access.index).padStart(3,'0')}-tool.json.gz`));assert(canonical(saved)===canonical(access),'A context access log changed.');}
      if(generation.status==='completed'){
        const last=generation.calls.at(-1);assert(last?.status==='completed'&&last.http.httpStatus===200&&output<=p.maximumOutputTokens,'Completed submission lacks a complete bounded provider response.');
        const visible=last.visibleOutput as Array<Record<string,any>>;
        const text=visible.filter(v=>v.type==='message'||v.type==='model_output').flatMap(v=>v.content??[]).filter(v=>v.type==='text'||v.type==='output_text').map(v=>v.text).join('');
        const submitted=JSON.parse(text);assert(submitted.source===generation.source,'Saved source differs from the provider final JSON.');
      }
      generationReceipts.set(generation.receiptHash,generation);
    }
    assert(grade.tokens===generation.totalTokens,'Grade usage differs from the provider receipt.');
    if(grade.stage==='graded'){
      assert(generation.status==='completed'&&grade.errorCode===null,'Executed grade lacks a completed model submission.');
      const runner=verifyReceipt(await readJson(join(path,'runner.json.gz'))),result=verifyReceipt(runner.result);
      assert(runner.kind==='anonymous_executed_grade'&&runner.receiptHash===grade.runnerReceiptHash&&runner.candidateId===grade.candidateId&&runner.taskId===grade.taskId&&runner.protocolHash===grade.protocolHash&&runner.sourceHash===grade.sourceHash&&runner.evaluatorHash===frozen.evaluatorHash,'Anonymous runner binding mismatch.');
      assert(result.sourceHash===grade.sourceHash&&result.evaluatorHash===frozen.evaluatorHash&&result.isolation.imageId===frozen.imageId,'Runner did not execute the frozen source/runtime.');
      assert(result.isolation.networkMode==='none'&&result.isolation.readOnlyRoot&&result.isolation.mountCount===0&&result.isolation.credentialEnvironmentForwarded===false&&result.isolation.hiddenTestsInsideContainer===false,'Runner isolation receipt is incomplete.');
      assert(grade.compilePassed===result.compilePassed&&grade.policyPassed===result.policyPassed&&grade.hiddenPassed===result.hiddenPassed&&canonical(grade.tests)===canonical(result.tests.map((t:Record<string,unknown>)=>({id:t.id,passed:t.passed}))),'Published grade differs from executed checks.');
      assert(result.hiddenPassed===Boolean(result.compilePassed&&result.policyPassed&&result.tests.length&&result.tests.every((t:Record<string,unknown>)=>t.passed)),'An executed pass is not supported by every gate.');
    }else if(grade.stage==='submission_failure')assert(generation.status==='submission_failure'&&grade.sourceHash===null&&grade.compilePassed===false&&grade.policyPassed===false&&grade.hiddenPassed===false&&!grade.tests.length&&grade.runnerReceiptHash===null&&grade.errorCode===generation.errorCode,'Invalid submission was relabeled or discarded.');
    else {
      assert(grade.compilePassed===null&&grade.policyPassed===null&&grade.hiddenPassed===null&&!grade.tests.length,'An infrastructure outcome must not have a target verdict.');
      if(generation.status==='completed'){const runner=verifyReceipt(await readJson(join(path,'runner.json.gz')));assert(runner.kind==='anonymous_runner_failure'&&runner.receiptHash===grade.runnerReceiptHash&&runner.sourceHash===grade.sourceHash&&grade.errorCode==='runner_unavailable','Runner infrastructure failure is unsupported.');}
      else assert(generation.status==='infrastructure_failure'&&grade.errorCode===generation.errorCode,'Provider infrastructure failure is unsupported.');
    }
    const group=groups.get(grade.candidateId)??[];assert(!group.some(g=>g.attemptNumber===grade.attemptNumber),'Duplicate attempt record.');group.push(grade);groups.set(grade.candidateId,group);
  }
  let retries=0;
  for(const history of groups.values()){
    history.sort((a,b)=>a.attemptNumber-b.attemptNumber);const first=history[0]!;
    assert(first.attemptNumber===1&&first.retryOf===null,'An original failed attempt was removed.');
    if(history.length===2){const second=history[1]!;assert(first.stage==='infrastructure_failure'&&p.infrastructureRetry.retryable.includes(first.errorCode as typeof p.infrastructureRetry.retryable[number])&&second.retryOf===digest(canonical(first))&&second.finishedAt>=first.finishedAt,'Retry was not predeclared or its first failure changed.');assert(Date.parse(startedRecords.get(`${second.candidateId}:2`)!.startedAt)-Date.parse(first.finishedAt)>=30000,'Infrastructure retry started before the fixed backoff elapsed.');if(first.sourceHash)assert(second.sourceHash===first.sourceHash&&second.providerReceiptHash===first.providerReceiptHash,'A runner retry regenerated or altered source.');retries++;}
  }
  return {grades:grades.sort((a,b)=>a.candidateId.localeCompare(b.candidateId)||a.attemptNumber-b.attemptNumber),generationReceipts,counts:{planned:queue.length,recordedCandidates:groups.size,missing:queue.length-groups.size,attemptRecords:grades.length,retries,modelGenerations:generationReceipts.size,providerRequests:providerDispatches,providerResponseRecords:[...generationReceipts.values()].reduce((s,g)=>s+g.calls.length,0),unansweredDispatches}};
}
