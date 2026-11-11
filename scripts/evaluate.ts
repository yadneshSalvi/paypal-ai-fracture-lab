import {readFile,mkdir,open} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {parseProtocol,verifyProtocolFiles,canonical,digest} from '../packages/evaluation/src/protocol';
import {assignments,graderAssignment} from '../packages/evaluation/src/schedule';
import {summarize} from '../packages/evaluation/src/results';

const args=process.argv.slice(2),command=args[0];
function option(name:string,required=true){const index=args.indexOf(`--${name}`);const value=index>=0?args[index+1]:undefined;if(required&&(!value||value.startsWith('--')))throw new Error(`Provide --${name}.`);return value;}
async function saveNew(path:string,value:unknown){await mkdir(dirname(path),{recursive:true});const file=await open(path,'wx',0o600);try{await file.writeFile(JSON.stringify(value,null,2)+'\n');await file.sync();}finally{await file.close();}}
async function main(){
 if(!command||command==='--help'||command==='help'){
   console.log('Fracture context evaluation\n\nverify --protocol manifest.json --root corpus\nfreeze --protocol manifest.json --root corpus --out new-directory\nsummarize --protocol frozen-protocol.json --root corpus --results grades.json --out new-summary.json\n\nFreeze verifies all 20 tasks, two model configurations, context hashes and paired token counts. It emits 600 assignments and an arm-free grader queue. It never makes model calls or executes candidate code. Candidate production and isolated grading supply immutable receipts; no experiment outcome is invented.');return;
 }
 const manifest=resolve(option('protocol')!),p=parseProtocol(JSON.parse(await readFile(manifest,'utf8'))),root=resolve(option('root')!),proof=await verifyProtocolFiles(root,p);
 if(command==='verify'){console.log(JSON.stringify({passed:true,...proof}));return;}
 if(command==='freeze'){
   const output=resolve(option('out')!);await mkdir(dirname(output),{recursive:true,mode:0o700});await mkdir(output,{recursive:false,mode:0o700});
   await saveNew(resolve(output,'protocol.json'),p);await saveNew(resolve(output,'assignments.private.json'),assignments(p));
   await saveNew(resolve(output,'grader-queue.json'),assignments(p).map(graderAssignment));
   await saveNew(resolve(output,'freeze.json'),{...proof,frozenAt:new Date().toISOString(),protocolFileHash:digest(JSON.stringify(p,null,2)+'\n'),status:'protocol_frozen',executedAttempts:0});
   console.log(JSON.stringify({status:'protocol_frozen',...proof,executedAttempts:0,output}));return;
 }
 if(command==='summarize'){
   if(p.schemaVersion===2)throw new Error('Executable study outcomes must pass eval:seal. Use eval:reproduce to verify an already sealed public report.');
   const raw=JSON.parse(await readFile(resolve(option('results')!),'utf8'));if(!Array.isArray(raw))throw new Error('The results file must contain an array of anonymized grader records.');
   const report=summarize(p,raw),output=resolve(option('out')!);await saveNew(output,report);
   console.log(JSON.stringify({output,protocolHash:proof.protocolHash,resultsHash:digest(canonical(raw)),planned:report.planned,graded:report.graded,missing:report.missing,infrastructureFailures:report.infrastructureFailures}));return;
 }
 throw new Error('Unknown evaluation command. Use --help.');
}
await main();
