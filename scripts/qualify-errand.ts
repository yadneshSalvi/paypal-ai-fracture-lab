import { readFile,writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SqliteDatabase,sha256 } from '@fracture/paypal-core';
import { initializeDatabase } from '../packages/service/src/database';
import { LabService,LabStore } from '../packages/service/src/index';
const db=new SqliteDatabase(':memory:');
try{
  await initializeDatabase(db);const service=new LabService(new LabStore(db)),session=await service.store.createSession('owner');
  const arms=[];
  for(const revision of ['faulty','hardened'] as const){
    const run=await service.startRun(session.id,{projectId:'errand',scenarioId:'E0',revision,mode:'sample',seed:'errand-qualification-v1',requestId:randomUUID(),interactive:false});
    const rows=(await db.query<{document:string}&Record<string,unknown>>('SELECT document FROM lab_target_attempts WHERE run_id=$1',[run.id])).rows.map(row=>JSON.parse(row.document));
    const resources=await service.store.resources(run.id);assert.equal(run.orderIds.length,revision==='faulty'?2:1);assert.equal(run.captureCount,0);assert.equal(run.verdict,revision==='faulty'?'fail':'pass');
    arms.push({revision,verdict:run.verdict,sourceHash:run.sourceHash,orderIds:run.orderIds,captures:run.captureCount,fulfilled:run.fulfillmentCount,toolResults:run.events.filter(e=>e.kind==='errand_tool_result').map(e=>({title:e.title,requestId:e.requestId,orderId:e.resourceId??null})),wire:rows.map(r=>({method:r.method,path:r.path,payloadHash:r.payloadHash,requestId:r.providerRequestId})),independentResources:resources.map(r=>({id:r.id,kind:r.kind,status:r.status,approved:r.approved})),invariants:run.invariants,durationMs:run.durationMs});
  }
  const sourcePaths=['apps/fixtures/errand/toolkit-worker.mjs','apps/fixtures/errand/toolkit.ts','apps/fixtures/errand/control.ts','apps/fixtures/errand/execute.ts'];
  const hashes=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,sha256(await readFile(path,'utf8'))])));
  const require=createRequire(import.meta.url);const toolkitHash=sha256(await readFile(require.resolve('@paypal/agent-toolkit/openai'),'utf8'));
  const proof={version:'1.0',verifiedAt:new Date().toISOString(),source:'sample',toolkit:{version:'1.11.0',distribution:'openai/index.js',sha256:toolkitHash},sourceHashes:hashes,externalRequests:0,modelDecision:false,arms,limitations:['Actual installed Toolkit executes against the persisted local provider model.','This is scripted fixture qualification, not live PayPal behavior, an AI decision, or a held-out evaluation.','Zero payer approvals, captures, real goods or funds movement.']};
  await writeFile('docs/evidence/errand-toolkit-qualification.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({qualified:true,orders:arms.map(a=>a.orderIds.length),captures:0,externalRequests:0}));
}finally{await db.close();}
