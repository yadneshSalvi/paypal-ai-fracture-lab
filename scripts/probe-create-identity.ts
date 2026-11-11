import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { prepareManifest, hash } from '../packages/provider-probes/src/contract';
import { ProbeStore } from '../packages/provider-probes/src/store';
import { probeDatabaseConnections } from '../packages/provider-probes/src/connection';
import { ProbeRunner } from '../packages/provider-probes/src/runner';
import { probeReport } from '../packages/provider-probes/src/report';
const paths=['packages/provider-probes/src/contract.ts','packages/provider-probes/src/store.ts','packages/provider-probes/src/connection.ts','packages/provider-probes/src/runner.ts','packages/provider-probes/src/report.ts','scripts/probe-create-identity.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,hash(await readFile(path,'utf8'))])));
const directory=resolve('.artifacts/provider-probes');await mkdir(directory,{recursive:true});
const [action,id]=process.argv.slice(2);if(!['prepare','run','report'].includes(action??''))throw Error('Use prepare, run <campaign UUID>, or report <campaign UUID>.');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
const connections=probeDatabaseConnections(process.env),pool=new pg.Pool({connectionString:connections.query,max:4}),lockPool=connections.lock===connections.query?pool:new pg.Pool({connectionString:connections.lock,max:1,connectionTimeoutMillis:8000,idleTimeoutMillis:15000}),store=new ProbeStore(pool,lockPool);
try{
 await store.initialize();
 if(action==='prepare'){
  if(process.env.PAYPAL_ENVIRONMENT!=='sandbox'||process.env.PAYPAL_API_BASE_URL!=='https://api-m.sandbox.paypal.com'||process.env.PAYPAL_PROJECT_ISOLATED!=='true'||!process.env.PAYPAL_CLIENT_ID)throw Error('Isolated sandbox configuration required');
  const url='https://developer.paypal.com/api/rest/reference/idempotency/';const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error'});if(!response.ok)throw Error(`Documentation HTTP ${response.status}`);const text=await response.text();if(!text.includes('PayPal-Request-Id'))throw Error('Documentation content unavailable');
  await writeFile(`${directory}/idempotency-documentation.html`,text,{mode:0o600});
  const manifest=prepareManifest({documentation:{url,sha256:hash(text)},merchantFingerprint:hash(process.env.PAYPAL_CLIENT_ID),sourceHashes});
  await store.prepare(manifest);await writeFile(`${directory}/${manifest.id}.manifest.json`,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({prepared:true,id:manifest.id,protocolHash:hash(manifest),calls:40,financialWrites:0,providerCalls:0}));
 }else{
  if(!id||!/^[0-9a-f-]{36}$/.test(id))throw Error('Exact prepared campaign UUID required');const manifest=await store.manifest(id);
  if(action==='run'){
   if(hash(sourceHashes)!==hash(manifest.sourceHashes))throw Error('Frozen implementation changed; retain original campaign without dispatch');
   const runner=new ProbeRunner(store,manifest,{environment:process.env.PAYPAL_ENVIRONMENT??'',baseUrl:process.env.PAYPAL_API_BASE_URL??'',isolated:process.env.PAYPAL_PROJECT_ISOLATED==='true',clientId:process.env.PAYPAL_CLIENT_ID??'',clientSecret:process.env.PAYPAL_CLIENT_SECRET??''});
   const result=await runner.run();console.log(JSON.stringify(result));
  }
  const report=probeReport(manifest,await store.calls(id));await writeFile(`${directory}/${id}.report.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({report:`.artifacts/provider-probes/${id}.report.json`,interpretation:report.interpretation,completedMatchedTrials:report.completedMatchedTrials,attemptedCalls:report.attemptedCalls,verifiedCalls:report.verifiedCalls}));
 }
}finally{if(lockPool!==pool)await lockPool.end();await pool.end();}
