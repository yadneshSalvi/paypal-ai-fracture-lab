import {mkdir,readFile,writeFile,open} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {digest,canonical} from '../packages/evaluation/src/protocol';
import {evaluationCredentials,providerRequest,type Provider} from '../packages/evaluation/src/provider-http';

const root=resolve(import.meta.dirname,'..'),keys=await evaluationCredentials(root),base=join(root,'evaluation/contexts');
const provenance=JSON.parse(await readFile(join(base,'provenance.json'),'utf8')),rawC=await readFile(join(base,'rest-full.md'),'utf8');
const prefix='Additional reference material follows.\n',suffix='\nEnd of additional reference material.';
const configurations=[{provider:'openai' as const,model:'gpt-6.1-sol'},{provider:'gemini' as const,model:'gemini-3.8-flash'}];
await mkdir(join(base,'tokenization'),{recursive:true});
for(const config of configurations)for(const language of ['typescript','python']){
  const path=join(base,'tokenization',`${config.provider}-${language}.json`);
  // An existing receipt is immutable. Regeneration requires a new protocol directory.
  try{await readFile(path);console.log(JSON.stringify({stage:'already_tokenized',provider:config.provider,language}));continue;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const events:unknown[]=[];
  async function count(text:string){
    const endpoint=config.provider==='openai'?'/v1/responses/input_tokens':`/v1beta/models/${config.model}:countTokens`;
    const body=config.provider==='openai'?{model:config.model,input:text}:{contents:[{parts:[{text}]}]};
    const result=await providerRequest(config.provider,endpoint,body,keys[config.provider],120000);
    const tokens=result.body?.input_tokens??result.body?.totalTokens;
    events.push({...result.receipt,model:config.model,textSha256:digest(text),tokens:typeof tokens==='number'?tokens:null});
    await writeFile(join(root,'.artifacts',`tokenization-${config.provider}-${language}.json`),JSON.stringify(events,null,2)+'\n');
    if(!result.body||!Number.isInteger(tokens)||tokens<=0)throw new Error(`Tokenizer failed: ${config.provider} ${result.receipt.errorCode??'missing_count'}`);
    return Number(tokens);
  }
  const overhead=await count(prefix+suffix),B=await readFile(join(base,`${language}-B.md`),'utf8'),budget=(await count(prefix+B+suffix))-overhead;
  let low=provenance.completeOperationsCharacters as number,high=rawC.length,best=low,bestTokens=(await count(prefix+rawC.slice(0,low)+suffix))-overhead;
  if(bestTokens>budget)throw new Error('The equal token budget cannot contain all six complete REST operation blocks.');
  const fullTokens=(await count(prefix+rawC+suffix))-overhead;
  if(fullTokens<Math.ceil(budget*.99))throw new Error('The raw REST source is too short to match the guidance budget without padding.');
  if(fullTokens<=budget){best=rawC.length;bestTokens=fullTokens;}
  else for(let iteration=0;iteration<22&&high-low>1;iteration++){
    const midpoint=Math.floor((low+high)/2),tokens=(await count(prefix+rawC.slice(0,midpoint)+suffix))-overhead;
    if(tokens<=budget){low=midpoint;best=midpoint;bestTokens=tokens;}else high=midpoint;
    if(budget-bestTokens<=Math.max(1,Math.floor(budget*.001)))break;
  }
  const C=rawC.slice(0,best),cPath=`evaluation/contexts/${config.provider}-${language}-C.md`;
  if(Math.abs(budget-bestTokens)>Math.max(1,Math.floor(budget*.01)))throw new Error('Context token budgets differ by more than 1%.');
  await writeFile(join(root,cPath),C);
  const receipt={schemaVersion:1,provider:config.provider,model:config.model,language,measuredAt:new Date().toISOString(),tokenizer:config.provider==='openai'?'OpenAI Responses input_tokens service':'Gemini models.countTokens service',method:'Exact provider count of fixed prefix + bundle + fixed suffix, minus fixed prefix/suffix overhead; UTF-16 source prefix truncation; no padding.',wrapper:{prefix,suffix,overheadTokens:overhead},tokenBudget:budget,B:{path:`evaluation/contexts/${language}-B.md`,sha256:digest(B),tokens:budget},C:{path:cPath,sha256:digest(C),tokens:bestTokens,characters:best,allSixOperationBlocksPresent:best>=provenance.completeOperationsCharacters},differenceFraction:Math.abs(budget-bestTokens)/budget,events};
  const output=await open(path,'wx');try{await output.writeFile(JSON.stringify({...receipt,receiptHash:digest(canonical(receipt))},null,2)+'\n');await output.sync();}finally{await output.close();}
  console.log(JSON.stringify({stage:'tokenized',provider:config.provider,language,B:budget,C:bestTokens,differencePercent:receipt.differenceFraction*100}));
}
