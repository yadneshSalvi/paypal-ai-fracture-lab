import { readFile } from 'node:fs/promises';
import { sha256 } from '@fracture/paypal-core';
import { artifactPath } from '../../service/src/config';

export const tandemSourceNames=['sdk_adapter.py','protocol.py','domain.py','worker.py'] as const;
export async function tandemSource(){
  const files=await Promise.all(tandemSourceNames.map(async name=>({name,content:await readFile(artifactPath(`apps/fixtures/tandem/${name}`))})));
  const hashes=Object.fromEntries(files.map(file=>[file.name,sha256(file.content.toString('utf8'))]));
  return {files,hashes,sourceHash:sha256(JSON.stringify(hashes))};
}
