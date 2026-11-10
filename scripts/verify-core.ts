import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { config } from "dotenv";
config({path:join(process.cwd(),".env"),quiet:true});
const digest=(text:string)=>createHash("sha256").update(text).digest("hex");
const root=process.cwd();const packageDir=join(root,"packages/paypal-core");const packageVersion=JSON.parse(readFileSync(join(packageDir,"package.json"),"utf8")).version as string;
const tests=spawnSync(process.execPath,["--import","tsx","--test","--test-reporter=tap","tests/paypal-core.test.ts","tests/paypal-sdk.test.ts","tests/paypal-commerce-rest.test.ts","tests/paypal-store-codec.test.ts"],{cwd:root,encoding:"utf8"});
if(tests.status!==0){process.stdout.write(tests.stdout);process.stderr.write(tests.stderr);process.exit(tests.status??1);}
const build=spawnSync(process.execPath,["node_modules/typescript/bin/tsc","-p","packages/paypal-core/tsconfig.build.json"],{cwd:root,encoding:"utf8"});
if(build.status!==0){process.stdout.write(build.stdout);process.stderr.write(build.stderr);process.exit(build.status??1);}
const sourceHashes=Object.fromEntries(readdirSync(join(packageDir,"src")).filter(name=>name.endsWith(".ts")).sort().map(name=>[`src/${name}`,digest(readFileSync(join(packageDir,"src",name),"utf8"))]));
const testFiles=["tests/paypal-core.test.ts","tests/paypal-sdk.test.ts","tests/paypal-commerce-rest.test.ts","tests/paypal-store-codec.test.ts"];
const result={schemaVersion:1,package:"@fracture/paypal-core",version:packageVersion,testedAt:new Date().toISOString(),nodeVersion:process.version,source:"sample",providerTraffic:"none; local fixture fetch only",adapters:process.env.DATABASE_URL?["postgres","sqlite"]:["sqlite"],passed:Number(tests.stdout.match(/^# pass (\d+)/m)?.[1]??0),failed:Number(tests.stdout.match(/^# fail (\d+)/m)?.[1]??0),build:"passed",command:"npm run verify:core",sourceHashes,testHashes:Object.fromEntries(testFiles.map(path=>[path,digest(readFileSync(join(root,path),"utf8"))]))};
mkdirSync(join(root,"docs/evidence"),{recursive:true});writeFileSync(join(root,"docs/evidence/core-conformance.json"),JSON.stringify(result,null,2)+"\n");
copyFileSync(join(root,"LICENSE"),join(packageDir,"LICENSE"));
const provenance={schemaVersion:1,name:result.package,version:result.version,license:"MIT",origin:"Fracture Lab hardened-control implementation",sdk:{package:"paypal",version:"2.29.0",repository:"https://github.com/context-plugins/paypal-typescript-sdk",commit:"5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2",vendored:false},testedAt:result.testedAt,conformance:{passed:result.passed,failed:result.failed,adapters:result.adapters,source:"sample",liveProviderQualification:false},sourceHashes};
writeFileSync(join(packageDir,"PROVENANCE.json"),JSON.stringify(provenance,null,2)+"\n");
process.stdout.write(`${result.passed} tests passed; ${result.adapters.join(" + ")} adapters; package build passed. Evidence: docs/evidence/core-conformance.json\n`);
