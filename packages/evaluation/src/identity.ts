import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical,digest} from './protocol';

export const evaluatorPaths=[
  'packages/evaluation/src/protocol.ts','packages/evaluation/src/identity.ts',
  'packages/evaluation/src/world.ts','packages/evaluation/src/cases.ts',
  'packages/evaluation/src/isolation.ts','packages/evaluation/src/grader.ts',
  'packages/evaluation/runtime/Dockerfile','packages/evaluation/runtime/supervisor.mjs',
  'packages/evaluation/runtime/worker.mjs','packages/evaluation/runtime/worker.py',
  'packages/evaluation/runtime/policy.mjs','packages/evaluation/runtime/policy.py',
  'packages/evaluation/runtime/channel.mjs','packages/evaluation/runtime/channel.d.mts',
  'evaluation/corpus/shared/api.ts','evaluation/corpus/shared/api.py',
  'evaluation/runtime-lock/manifest.json',
] as const;

export async function evaluatorIdentity(root:string){
  const runtime=JSON.parse(await readFile(join(root,'evaluation/runtime-lock/manifest.json'),'utf8')) as {inputs:Record<string,string>;snapshotHash:string};
  if(digest(canonical(runtime.inputs))!==runtime.snapshotHash)throw new Error('Runtime input manifest was modified.');
  for(const [name,sha256] of Object.entries(runtime.inputs)){
    const path=name.startsWith('runtime/')?`packages/evaluation/runtime/${name.slice(8)}`:name==='Dockerfile'?'packages/evaluation/runtime/Dockerfile':name==='api.ts'||name==='api.py'?`evaluation/corpus/shared/${name}`:`evaluation/runtime-lock/${name}`;
    if(digest(await readFile(join(root,path)))!==sha256)throw new Error(`Runtime must be rebuilt after editing ${path}.`);
  }
  const files=await Promise.all(evaluatorPaths.map(async path=>({path,sha256:digest(await readFile(join(root,path)))})));
  return {sha256:digest(canonical(files)),files};
}
