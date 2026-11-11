import {resolve} from 'node:path';
import {executeStudy,defaultStudyId,loadStudy} from '../packages/evaluation/src/study';
import {parseProtocol,verifyProtocolFiles,canonical} from '../packages/evaluation/src/protocol';
import {readJson} from '../packages/evaluation/src/artifacts';
const args=process.argv.slice(2),index=args.indexOf('--study'),id=index>=0?args[index+1]!:defaultStudyId,root=resolve(import.meta.dirname,'..');
const option=(name:string)=>{const i=args.indexOf(`--${name}`);return i<0?undefined:args[i+1];};
if(option('arms')&&option('arms')!=='A,B,C')throw new Error('This frozen study requires all three arms; selective execution is not supported.');
if(option('protocol')){
  const protocol=parseProtocol(await readJson(resolve(option('protocol')!)));await verifyProtocolFiles(root,protocol);
  if(option('seeds')&&option('seeds')!==protocol.seedLabels.join(','))throw new Error('Seed labels must match the frozen protocol.');
  if(args.includes('--verify-only')){console.log(JSON.stringify({status:'public_protocol_verified',...(await verifyProtocolFiles(root,protocol))}));process.exit(0);}
  const study=await loadStudy(root,id);if(canonical(study.p)!==canonical(protocol))throw new Error('The supplied protocol differs from the original frozen study.');
}
if(args.includes('--help'))console.log('Run the immutable context study: npm run eval:context -- --study fracture-context-2026-11-v1 [--verify-only | --first-block]\nExisting terminal attempts are preserved. The first block is six original scheduled candidates; it is not a discarded pilot. All comparisons remain withheld until seal-context-study verifies and seals the complete history.');
else if(args.includes('--verify-only')){const study=await loadStudy(root,id);console.log(JSON.stringify({status:'verified',studyId:id,protocolHash:study.frozen.protocolHash,planned:study.rows.length}));}
else console.log(JSON.stringify(await executeStudy(root,id,args.includes('--first-block'))));
