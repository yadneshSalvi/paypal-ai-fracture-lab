import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {taskDefinitions} from './cases';
import {evaluatorIdentity} from './identity';
import {readJson,verifyReceipt} from './artifacts';
import {canonical,digest} from './protocol';

export async function qualifyCorpus(root:string){
  const evaluator=await evaluatorIdentity(root),runtime=await readJson(join(root,'evaluation/runtime-lock/manifest.json'));
  const tasks=[];
  for(const task of taskDefinitions){
    const dir=`evaluation/corpus/tasks/${task.id}`,extension=task.language==='TypeScript'?'ts':'py';
    const proof=await readJson(join(root,dir,'control-proof.json'));
    if(!proof.qualified||proof.taskId!==task.id||proof.imageId!==runtime.imageId||proof.evaluatorHash!==evaluator.sha256)throw new Error(`Control qualification is missing or stale: ${task.id}`);
    if(digest(await readFile(join(root,proof.rawReceipt.path)))!==proof.rawReceipt.sha256)throw new Error('Control raw-receipt file changed.');
    const records=await readJson<Array<Record<string,any>>>(join(root,proof.rawReceipt.path));
    if(records.length!==2)throw new Error('Every task requires one faulty and one hardened control.');
    for(const [index,name] of ['baseline','golden'].entries()){
      const record=records[index]!,sourceHash=digest(await readFile(join(root,dir,`${name}.${extension}`))),receipt=verifyReceipt(record.result);
      if(record.control!==name||record.sourceHash!==sourceHash||receipt.sourceHash!==sourceHash||receipt.evaluatorHash!==evaluator.sha256||receipt.isolation.imageId!==runtime.imageId||!receipt.compilePassed||!receipt.policyPassed||receipt.hiddenPassed!==(name==='golden')||!receipt.tests.length)throw new Error(`A control does not prove the frozen source: ${task.id} ${name}`);
      if(proof.controls[index].receiptHash!==receipt.receiptHash)throw new Error('Control proof and executed receipt differ.');
    }
    const baseline=await readJson(join(root,dir,'public-baseline.json')),bad=records[0]!.result;
    if(baseline.sourceHash!==bad.sourceHash||baseline.evaluatorHash!==evaluator.sha256||canonical(baseline.tests)!==canonical(bad.cases.filter((c:Record<string,any>)=>c.visibility==='public').flatMap((c:Record<string,any>)=>c.checks)))throw new Error('Public baseline receipt differs from executed visible tests.');
    tasks.push({taskId:task.id,title:task.title,family:task.family,language:task.language,split:task.split,qualified:true,baselineHash:records[0]!.sourceHash,goldenHash:records[1]!.sourceHash,controlProof:{path:`${dir}/control-proof.json`,sha256:digest(await readFile(join(root,dir,'control-proof.json')))},checks:records[1]!.result.tests.length,publicCases:task.cases.filter(t=>t.visibility==='public').length,hiddenCases:task.cases.filter(t=>t.visibility==='hidden').length});
  }
  const safety=verifyReceipt(await readJson(join(root,'evaluation/qualification/safety.json')));
  if(!safety.allPassed||safety.evaluatorHash!==evaluator.sha256||safety.imageId!==runtime.imageId||safety.probes.length!==11||safety.controlChannel!=='authenticated_fd3'||safety.probes.some((p:Record<string,any>)=>!p.passed))throw new Error('Safety qualification is missing or stale.');
  const blind=verifyReceipt(await readJson(join(root,'evaluation/qualification/blind-runner.json')));
  if(!blind.passed||blind.evaluatorHash!==evaluator.sha256||!blind.unexpectedTreatmentFieldsRejected||blind.results.length!==2)throw new Error('Anonymous process boundary is not qualified.');
  for(const file of blind.hostBoundaryFiles)if(digest(await readFile(join(root,file.path)))!==file.sha256)throw new Error('Anonymous process boundary changed.');
  return {schemaVersion:1,evaluatorHash:evaluator.sha256,imageId:runtime.imageId,tasks,safety:{path:'evaluation/qualification/safety.json',sha256:digest(await readFile(join(root,'evaluation/qualification/safety.json')))},blindBoundary:{path:'evaluation/qualification/blind-runner.json',sha256:digest(await readFile(join(root,'evaluation/qualification/blind-runner.json')))},qualifiedAt:new Date().toISOString(),source:'executed_deterministic_offline_sdk',newLiveProviderEvidence:false};
}
export async function qualifiedProviderBindings(root:string){
  const dir=join(root,'evaluation/provider-qualification'),names=(await readdir(dir)).sort().reverse(),bindings=[];
  for(const provider of ['openai','gemini']){
    let found=false;
    for(const name of names.filter(n=>n.startsWith(`${provider}-bindings-`)&&n.endsWith('.json'))){
      const receipt=await readJson(join(dir,name));if(!receipt.passed||!Array.isArray(receipt.implementationFiles))continue;
      let current=true;for(const file of receipt.implementationFiles)if(digest(await readFile(join(root,file.path)))!==file.sha256)current=false;
      if(!current)continue;
      if(receipt.configuration.maximumOutputTokens!==65536||receipt.configuration.maximumToolCalls!==24||receipt.result.status!=='completed')throw new Error('Provider binding settings differ from the study.');
      bindings.push({provider,path:`evaluation/provider-qualification/${name}`,sha256:digest(await readFile(join(dir,name))),model:receipt.model});found=true;break;
    }
    if(!found)throw new Error(`Current provider gateway has not passed its binding qualification: ${provider}`);
  }
  return bindings;
}
