// Hermetic freshness check for docs/evidence/application-conformance.json.
// Runs no tests, opens no database and reads no .env: it only hashes the files that
// decide whether contract rows may show "verified" and compares them with the committed proof.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bindContractRows, conformanceFreshness, contractRuntimePaths, type ApplicationProof } from "../packages/analysis/src/contract-bindings";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");const proofPath="docs/evidence/application-conformance.json";
const hashes:Record<string,string|null>=Object.fromEntries(await Promise.all(contractRuntimePaths.map(async path=>[path,existsSync(join(root,path))?createHash("sha256").update(await readFile(join(root,path))).digest("hex"):null] as const)));
let proof:unknown=null;try{proof=JSON.parse(await readFile(join(root,proofPath),"utf8"));}catch{/* A missing or unreadable proof is reported below. */}
const result=conformanceFreshness(hashes,proof);
const reasons={changed:"changed since the proof was produced",not_in_proof:"not covered by the proof",file_missing:"missing from this checkout"};
let verified=0;
if(result.fresh){const present=Object.fromEntries(Object.entries(hashes).filter((entry):entry is [string,string]=>typeof entry[1]==="string"));verified=bindContractRows(await readFile(join(root,"apps/fixtures/bramble/hardened.ts"),"utf8"),await readFile(join(root,"tests/application.test.ts"),"utf8"),present,proof as ApplicationProof).filter(row=>row.status==="verified").length;}
if(result.fresh&&verified===result.expectedVerified){console.log(`Conformance proof is current: ${contractRuntimePaths.length} runtime files match ${proofPath} (tested ${result.testedAt}); ${verified} of ${result.expectedVerified} executable contract rows verify. Sample evidence from the local provider model.`);}
else{
 console.error(`Conformance proof is STALE: ${proofPath} does not describe this checkout, so /contract-sheet cannot show verified rows.`);
 for(const item of result.stale)console.error(`  stale  ${item.path} (${reasons[item.reason]})`);
 for(const problem of result.problems)console.error(`  proof  ${problem}`);
 if(result.fresh)console.error(`  rows   only ${verified} of ${result.expectedVerified} executable contract rows verify; a named test is missing from the proof or did not pass on every adapter.`);
 console.error("Fix: run `npm run verify:app` (typecheck plus the application and model tests on the local provider model) and commit the regenerated proof.");
 process.exitCode=1;
}
