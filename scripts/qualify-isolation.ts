import assert from "node:assert/strict";
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runIsolatedCandidate } from "../packages/isolation/src/local";
import { artifactPath } from "../packages/service/src/config";
import { LabError } from "../packages/service/src/errors";
const baseline=await readFile(artifactPath("apps/fixtures/bramble/faulty.ts"),"utf8");const reference=(await readFile(artifactPath("apps/fixtures/bramble/hardened.ts"),"utf8")).replace("export async function hardenedCheckout(","export async function faultyCheckout(");
await mkdir(artifactPath(".artifacts/isolation"),{recursive:true});
const faulty=await runIsolatedCandidate(baseline);await writeFile(artifactPath(".artifacts/isolation/baseline-result.json"),JSON.stringify(faulty,null,2));console.log(JSON.stringify({candidate:"original baseline",stage:faulty.stage,tests:faulty.tests.map(test=>({id:test.id,status:test.status,detail:test.detail}))}));
const hardened=await runIsolatedCandidate(reference);await writeFile(artifactPath(".artifacts/isolation/reference-result.json"),JSON.stringify(hardened,null,2));console.log(JSON.stringify({candidate:"human reference",stage:hardened.stage,tests:hardened.tests.map(test=>({id:test.id,status:test.status,detail:test.detail}))}));
assert.equal(faulty.tests.find(test=>test.id==="happy")?.status,"pass");assert.equal(faulty.passed,false);assert.equal(hardened.passed,true);
const timeoutStarted=Date.now();let supervisorCode="";
try{await runIsolatedCandidate("export async function faultyCheckout() { for (;;) { /* Intentional CPU loop for boundary qualification. */ } }");}
catch(error){if(error instanceof LabError&&error.code==="CANDIDATE_RUNTIME"&&error.message.includes("code 137"))supervisorCode="container_supervisor_killed_cpu_loop";else throw error;}
const supervisor={probe:"intentional_cpu_loop",outcome:supervisorCode,elapsedMs:Date.now()-timeoutStarted};
assert.equal(supervisor.outcome,"container_supervisor_killed_cpu_loop");assert.ok(supervisor.elapsedMs>=50000&&supervisor.elapsedMs<65000,"The independent in-container supervisor must stop execution before the outer deadline.");
console.log(JSON.stringify({supervisor}));
const proof={schemaVersion:1,source:"sample",qualifiedAt:new Date().toISOString(),candidateProvenance:"human_reference_and_original_baseline",modelGenerated:false,providerTraffic:"none",baseline:{stage:faulty.stage,passed:faulty.passed,candidateHash:faulty.candidateHash,tests:faulty.tests},reference:{stage:hardened.stage,passed:hardened.passed,candidateHash:hardened.candidateHash,tests:hardened.tests},suiteHash:hardened.suiteHash,runnerReceipt:hardened.runnerReceipt,supervisor,limitations:["One bounded TypeScript checkout contract; not arbitrary repository execution.","This qualifies the isolated executor using original and human-reference source. It is not a generated repair result.","Static capability restrictions complement the container; no claim of formal JavaScript noninterference.","Hosted Vercel Sandbox and Python runners require separate qualification."]};await writeFile(artifactPath("docs/evidence/isolation-qualification.json"),JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify({passed:true,artifact:join("docs","evidence","isolation-qualification.json")}));
