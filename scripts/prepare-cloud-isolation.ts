import {readFile,readdir,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import {createHash,randomUUID} from "node:crypto";
import {Sandbox} from "@vercel/sandbox";
import {workspaceRoot} from "../packages/service/src/config";

// Prepare public inputs first: npm run prepare:isolation -- --context-only.
// SDK authentication stays on this trusted host (Vercel OIDC, or explicit environment).
const root=workspaceRoot(), context=join(root,".artifacts/isolation-build");
const auth=process.env.VERCEL_TOKEN?{token:process.env.VERCEL_TOKEN,teamId:process.env.VERCEL_TEAM_ID!,projectId:process.env.VERCEL_PROJECT_ID!}:{};
if(process.env.VERCEL_TOKEN&&(!process.env.VERCEL_TEAM_ID||!process.env.VERCEL_PROJECT_ID))throw new Error("Explicit authentication requires all three Vercel variables.");
const privateValues=Object.entries(process.env).filter(([key,value])=>/SECRET|PASSWORD|API_KEY|TOKEN|DATABASE_URL/i.test(key)&&value&&value.length>=18).map(([,value])=>value!);
async function files(path:string):Promise<string[]>{const result:string[]=[];for(const entry of await readdir(join(context,path),{withFileTypes:true})){const child=join(path,entry.name);if(entry.isDirectory())result.push(...await files(child));else if(entry.isFile())result.push(child);else throw new Error("Only regular public snapshot files are allowed.");}return result.sort();}
const inputs=["package.json","package-lock.json","vendor/fracture-paypal-core-0.2.2.tgz",...await files("snapshot")];
const entries=[];for(const path of inputs){const content=await readFile(join(context,path));if(privateValues.some(value=>content.includes(Buffer.from(value))))throw new Error("Private configuration was found in a build input.");entries.push({path:path.startsWith("snapshot/")?`/${path}`:`/runtime/${path}`,content});}
const digest=createHash("sha256");for(const entry of entries){digest.update(entry.path);digest.update(entry.content);}const inputHash=digest.digest("hex");
const suiteHash=createHash("sha256").update(await readFile(join(context,"snapshot/packages/isolation/runner/suite.ts"))).digest("hex");
let sandbox:Sandbox|undefined;
async function command(cmd:string,args:string[],options:{cwd?:string;sudo?:boolean;timeoutMs?:number}={}){const result=await sandbox!.runCommand({cmd,args,...options,timeoutMs:options.timeoutMs??120000});if(result.exitCode!==0)throw new Error(`Build command ${cmd} failed (${result.exitCode}); no snapshot was published.`);return result.stdout();}
try{
  sandbox=await Sandbox.create({...auth,name:`fracture-runner-build-${randomUUID().slice(0,8)}`,image:"vercel/sandbox/node:22",persistent:false,resources:{vcpus:2},timeout:600000,networkPolicy:{allow:["registry.npmjs.org","github.com","codeload.github.com","api.github.com","objects.githubusercontent.com","release-assets.githubusercontent.com"]},tags:{project:"fracture-lab",purpose:"runner-build"}});
  await command("mkdir",["-p","/runtime","/snapshot"],{sudo:true});
  for(let offset=0;offset<entries.length;offset+=20)await sandbox.writeFiles(entries.slice(offset,offset+20));
  await command("git",["config","--global","url.https://github.com/.insteadOf","ssh://git@github.com/"]);
  await command("npm",["ci","--no-audit","--no-fund"],{cwd:"/runtime",timeoutMs:300000});
  await command("ln",["-s","/runtime/node_modules","/snapshot/node_modules"],{sudo:true});
  await sandbox.createUser("candidate");await command("chown",["-R","root:root","/runtime","/snapshot"],{sudo:true});await command("chmod",["-R","a-w","/runtime","/snapshot"],{sudo:true});
  await sandbox.update({networkPolicy:"deny-all"});
  const check=await sandbox.asUser("candidate").runCommand({cmd:"node",args:["-e",`const fs=require('node:fs');let writable=true;try{fs.accessSync('/snapshot/packages/isolation/runner/suite.ts',fs.constants.W_OK);}catch{writable=false;}console.log(JSON.stringify({node:process.version,uid:process.getuid(),fixtureWritable:writable,sensitiveKeys:Object.keys(process.env).filter(k=>/SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL/.test(k))}));`],timeoutMs:10000});
  if(check.exitCode!==0)throw new Error("Candidate boundary check did not finish.");const boundary=JSON.parse(await check.stdout()) as {uid:number;fixtureWritable:boolean;sensitiveKeys:string[]};
  if(boundary.uid===0||boundary.fixtureWritable||boundary.sensitiveKeys.length)throw new Error("Candidate boundary check failed.");
  const snapshot=await sandbox.snapshot({expiration:30*24*60*60*1000});if(snapshot.status!=="created")throw new Error("Snapshot was not created.");
  const manifest={schemaVersion:1,snapshotId:snapshot.snapshotId,inputHash,suiteHash,fileCount:entries.length,boundary,networkPolicy:"deny-all",noApplicationCredentials:true,createdAt:new Date().toISOString(),expiresAt:snapshot.expiresAt?.toISOString(),region:sandbox.region};
  await mkdir(join(root,".artifacts/isolation-cloud"),{recursive:true});await writeFile(join(root,".artifacts/isolation-cloud/snapshot.json"),JSON.stringify(manifest,null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify({stage:"snapshot_created",snapshotId:snapshot.snapshotId,inputHash,suiteHash,privateValueMatches:0}));
}finally{if(sandbox)await sandbox.stop();}
