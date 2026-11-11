import {mkdir,writeFile,readFile,open} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {evaluationCredentials} from '../packages/evaluation/src/provider-http';
import {generateCandidate} from '../packages/evaluation/src/gateway';
import {canonical,digest} from '../packages/evaluation/src/protocol';
const root=resolve(import.meta.dirname,'..'),keys=await evaluationCredentials(root),directory=join(root,'evaluation/provider-qualification');
await mkdir(directory,{recursive:true});
for(const provider of ['openai','gemini'] as const){
  if(process.argv[2]&&process.argv[2]!==provider)continue;
  const model=provider==='openai'?'gpt-6.1-sol':'gemini-3.8-flash',stamp=new Date().toISOString().replaceAll(':','-'),prefix=`${provider}-bindings-${stamp}`;
  const events:unknown[]=[];
  const result=await generateCandidate({provider,model,key:keys[provider],maximumOutputTokens:65536,maximumToolCalls:24,maximumSourceBytes:120000,providerDeadlineMs:900000,
    system:'This is an API binding qualification, not a study task. You must first call read_file with path="qualification.txt", startLine=1 and lineCount=10. Then return JSON with source set to the exact token in that file and summary set to "binding checked". Do not include private reasoning.',
    prompt:'Verify one read-only function call and one structured final output using the token returned by the tool.',
    execute:(name,args)=>name==='read_file'&&args.path==='qualification.txt'?{content:'QUALIFIED_READ_ONLY_BINDING'}:{error:'FILE_NOT_ALLOWED'},
    persist:async(kind,index,value)=>{events.push({kind,index,value});await writeFile(join(root,'.artifacts',`${prefix}.json`),JSON.stringify(events,null,2)+'\n');},
  });
  const passed=result.status==='completed'&&result.source==='QUALIFIED_READ_ONLY_BINDING'&&result.toolAccesses.some(t=>t.name==='read_file');
  const implementationFiles=await Promise.all(['packages/evaluation/src/provider-http.ts','packages/evaluation/src/gateway.ts','packages/evaluation/src/model-workspace.ts'].map(async path=>({path,sha256:digest(await readFile(join(root,path)))})));
  const receipt={schemaVersion:1,kind:'api_binding_qualification',studyTask:false,qualityMeasurement:false,passed,model,provider,implementationFiles,configuration:{maximumOutputTokens:65536,maximumToolCalls:24,maximumSourceBytes:120000,providerDeadlineMs:900000,reasoning:provider==='openai'?'max':'high',continuation:provider==='openai'?'stateless_encrypted_reasoning':'previous_interaction_id'},result,eventsHash:digest(canonical(events))};
  const file=await open(join(directory,`${prefix}.json`),'wx');try{await file.writeFile(JSON.stringify(receipt,null,2)+'\n');await file.sync();}finally{await file.close();}
  console.log(JSON.stringify({stage:'provider_binding',provider,model,passed,status:result.status,errorCode:result.errorCode,requests:result.calls.length,tokens:result.totalTokens,estimatedCostUsd:result.estimatedCostUsd}));
  if(!passed)process.exitCode=1;
}
