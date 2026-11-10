import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir,readFile,mkdir,writeFile } from "node:fs/promises";
import { join,relative } from "node:path";
import { sha256 } from "@fracture/paypal-core";
import { workspaceRoot } from "../packages/service/src/config";
const root=workspaceRoot();
async function walk(directory:string):Promise<string[]>{const entries=await readdir(join(root,directory),{withFileTypes:true});const result:string[]=[];for(const entry of entries){if(entry.name.startsWith(".")||entry.name==="node_modules"||entry.name==="dist")continue;const path=join(directory,entry.name);if(entry.isDirectory())result.push(...await walk(path));else if(/\.(?:ts|tsx)$/.test(entry.name))result.push(path);}return result;}
const paths=[...await walk("packages/service"),...await walk("packages/ai"),...await walk("packages/runner"),...await walk("packages/invariants"),...await walk("packages/scenarios"),...await walk("packages/contracts"),...await walk("apps/fixtures"),...await walk("apps/web"),"tests/application.test.ts","tests/ai.test.ts","apps/fixtures/bramble/paypal-plan.md","vendor/fracture-paypal-core-0.2.2.tgz"];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.sort().map(async path=>[path.replaceAll("\\","/"),createHash("sha256").update(await readFile(join(root,path))).digest("hex")])));
const before=await hashes();const startedAt=new Date().toISOString();
execFileSync("npm",["run","typecheck"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:16*1024*1024});
const tap=execFileSync(join(root,"node_modules/.bin/tsx"),["--test","tests/application.test.ts","tests/ai.test.ts"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:16*1024*1024});
const passed=Number(tap.match(/^# pass (\d+)$/m)?.[1]);const failed=Number(tap.match(/^# fail (\d+)$/m)?.[1]);if(!passed||failed!==0)throw new Error("No passing unchanged application result was recorded.");const after=await hashes();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error("Application sources changed during verification. No new proof was published.");
let build="not_run";if(process.argv.includes("--build")){execFileSync("npm",["run","build"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"],maxBuffer:16*1024*1024});build="passed";}
const adapters=process.env.DATABASE_URL?["postgresql","sqlite"]:["sqlite"];
const proof={schemaVersion:1,source:"sample",testedAt:new Date().toISOString(),startedAt,nodeVersion:process.version,command:"npm run verify:app",providerTraffic:"none; local persistent provider model",coreVersion:"0.2.2",coreArchiveSha256:before["vendor/fracture-paypal-core-0.2.2.tgz"],adapters,passed,failed,typecheck:"passed",build,happyPath:{passed:adapters.length*2,total:adapters.length*2,scope:"Faulty and hardened original purchase behavior on each database adapter; this is not a chaos-invariant pass."},sourceHashes:before,tapHash:sha256(tap)};
await mkdir(join(root,".artifacts/verification"),{recursive:true});await mkdir(join(root,"docs/evidence"),{recursive:true});await writeFile(join(root,".artifacts/verification/application.tap"),tap);await writeFile(join(root,"docs/evidence/application-conformance.json"),JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify({passed,failed,typecheck:proof.typecheck,build,adapters,artifact:relative(root,join(root,"docs/evidence/application-conformance.json"))},null,2));
