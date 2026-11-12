/** New imported-source snapshot. The accepted repair snapshot is an immutable public dependency parent. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { Sandbox } from "@vercel/sandbox";
import { objectHash, sha256 } from "../packages/source-execution/src/hash";
import { PUBLIC_SUITE_HASH, SOURCE_EXECUTION_PROTOCOL } from "../packages/source-execution/src/limits";
import { sourceCloudFetch } from "../packages/source-execution/src/cloud";

export const PARENT_SOURCE_SNAPSHOT = { id: "snap_Kx4UOuUnD13OfjlkMA1ngw0cadrb", hash: "a052102ff3f02d0d373b869a11ac78ccc671a67172c6827169815194ea246469", node: "22.23.5" } as const;
const originalContext = "a62a5234fa2c615000731e6a9e482445ba063abde8b9536bb1b8aa3f0bc22bdf";
interface FileProof { path: string; sha256: string; bytes: number }
interface Context { protocol: typeof SOURCE_EXECUTION_PROTOCOL; sourceBase: string; parentSnapshot: typeof PARENT_SOURCE_SNAPSHOT; snapshotHash: string; runnerHash: string; adapterHash: string; dependencyHash: string; suiteHash: string; files: FileProof[] }
function writeExclusive(file: string, value: unknown) { const fd = fs.openSync(file, "wx", 0o600); try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)+"\n"); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }

export function prepareCloudSourceReference(root: string, qualifiedContext: string, evidence: string) {
  const previous = JSON.parse(fs.readFileSync(path.join(qualifiedContext, "reference/source-execution-context.json"), "utf8")) as Context;
  assert.equal(previous.snapshotHash, originalContext); assert.equal(previous.suiteHash, PUBLIC_SUITE_HASH);
  const contents = new Map<string, Buffer>();
  for (const f of previous.files) {
    assert.ok(!path.isAbsolute(f.path) && !f.path.split("/").includes(".."));
    const file=path.join(qualifiedContext,"reference",f.path), stat=fs.lstatSync(file), bytes=fs.readFileSync(file);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink()); assert.equal(bytes.length,f.bytes); assert.equal(sha256(bytes),f.sha256); contents.set(f.path,bytes);
  }
  const overlay = (directory: string) => { for (const item of fs.readdirSync(path.join(root,directory),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const name=path.posix.join(directory,item.name); if(item.isDirectory())overlay(name); else { assert.ok(item.isFile()&&name.endsWith(".ts")); contents.set(name,fs.readFileSync(path.join(root,name))); } } };
  overlay("packages/source-execution");
  const files=[...contents].map(([name,bytes])=>({path:name,bytes:bytes.length,sha256:sha256(bytes)})).sort((a,b)=>a.path.localeCompare(b.path));
  assert.equal(files.find(f=>f.path==="packages/isolation/runner/suite.ts")?.sha256,PUBLIC_SUITE_HASH);
  const sourceBase=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
  const dependencyHash=objectHash({parentSnapshot:PARENT_SOURCE_SNAPSHOT,qualifiedDockerDependencyHash:previous.dependencyHash});
  const runnerHash=objectHash({protocol:SOURCE_EXECUTION_PROTOCOL,files:files.filter(f=>f.path.startsWith("packages/source-execution/")),suiteHash:PUBLIC_SUITE_HASH,adapterHash:previous.adapterHash,dependencyHash,engine:"vercel-sandbox",candidateUid:1001});
  const snapshotHash=objectHash({sourceBase,parentSnapshot:PARENT_SOURCE_SNAPSHOT,files,dependencyHash,runnerHash,adapterHash:previous.adapterHash});
  const manifest:Context={protocol:SOURCE_EXECUTION_PROTOCOL,sourceBase,parentSnapshot:PARENT_SOURCE_SNAPSHOT,snapshotHash,runnerHash,adapterHash:previous.adapterHash,dependencyHash,suiteHash:PUBLIC_SUITE_HASH,files};
  const directory=path.join(evidence,"contexts",snapshotHash);fs.mkdirSync(path.dirname(directory),{recursive:true,mode:0o700});fs.mkdirSync(directory,{mode:0o700});
  for(const[name,bytes]of contents){const f=path.join(directory,"reference",name);fs.mkdirSync(path.dirname(f),{recursive:true,mode:0o700});fs.writeFileSync(f,bytes,{flag:"wx",mode:0o600});}
  writeExclusive(path.join(directory,"reference/source-execution-context.json"),manifest);
  writeExclusive(path.join(directory,"preparation.json"),{schema:"fracture.source-cloud-preparation/v1",state:"prepared_only",directory,manifestHash:objectHash(manifest),...manifest,buildCalls:0,providerCalls:0,modelCalls:0});
  return {directory,manifest};
}

export async function buildCloudSourceReference(directory:string,evidence:string){
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,"reference/source-execution-context.json"),"utf8")) as Context;
  assert.equal(manifest.parentSnapshot.id,PARENT_SOURCE_SNAPSHOT.id);assert.equal(manifest.suiteHash,PUBLIC_SUITE_HASH);
  const entries=manifest.files.map(f=>{const bytes=fs.readFileSync(path.join(directory,"reference",f.path));assert.equal(sha256(bytes),f.sha256);return{path:"/reference/"+f.path,content:bytes};});
  entries.push({path:"/reference/source-execution-context.json",content:fs.readFileSync(path.join(directory,"reference/source-execution-context.json"))});
  const secrets=Object.entries(process.env).filter(([k,v])=>/TOKEN|SECRET|PASSWORD|API_KEY|DATABASE_URL/.test(k)&&v&&v.length>15).map(([,v])=>v!);
  assert.ok(entries.every(e=>secrets.every(s=>!e.content.includes(Buffer.from(s)))),"No private configuration may enter the public snapshot.");
  fs.mkdirSync(evidence,{recursive:true,mode:0o700});const name="fracture-source-build-"+randomUUID().slice(0,12);
  writeExclusive(path.join(evidence,"build-intent.json"),{at:new Date().toISOString(),name,snapshotHash:manifest.snapshotHash,manifestHash:objectHash(manifest),parent:PARENT_SOURCE_SNAPSHOT,maximumBuildVms:1,networkPolicy:"deny-all",dependencyInstallations:0,importedCodeExecutions:0});
  const fd=fs.openSync(path.join(evidence,"build-journal.jsonl"),"wx",0o600);const record=(value:unknown)=>{fs.writeSync(fd,JSON.stringify({at:new Date().toISOString(),value})+"\n");fs.fsyncSync(fd);};
  const auth=process.env.VERCEL_TOKEN?{token:process.env.VERCEL_TOKEN,teamId:process.env.VERCEL_TEAM_ID!,projectId:process.env.VERCEL_PROJECT_ID!}:{};
  if(process.env.VERCEL_TOKEN)assert.ok(process.env.VERCEL_TEAM_ID&&process.env.VERCEL_PROJECT_ID);
  const fetch=sourceCloudFetch();let vm:Sandbox|undefined;let intent=false;let final:unknown;
  try{
    record({phase:"create_intent",name});intent=true;
    vm=await Sandbox.create({...auth,fetch,name,source:{type:"snapshot",snapshotId:PARENT_SOURCE_SNAPSHOT.id},persistent:false,resources:{vcpus:2},timeout:300000,networkPolicy:"deny-all",tags:{project:"fracture-lab",purpose:"source-runner-build"},signal:AbortSignal.timeout(30000)});
    record({phase:"created",name:vm.name});assert.equal(vm.networkPolicy,"deny-all");assert.equal(vm.persistent,false);assert.equal(Object.keys(vm.mounts??{}).length,0);
    const run=async(cmd:string,args:string[],timeoutMs=15000)=>{record({phase:"trusted_command_intent",cmd,argsHash:objectHash(args)});const result=await vm!.currentSession().runCommand({cmd,args,sudo:true,timeoutMs,signal:AbortSignal.timeout(timeoutMs+5000)});const stdout=await result.stdout(),stderr=await result.stderr();record({phase:"trusted_command_observed",exitCode:result.exitCode,stdoutHash:sha256(stdout),stderrHash:sha256(stderr)});assert.equal(result.exitCode,0,stderr.slice(0,1000));return stdout;};
    await run("bash",["-c","test ! -e /reference; mkdir /reference; chown 1000:1000 /reference; test $(id -u candidate) = 1001; command -v setpriv; test -d /runtime/node_modules"]);
    for(let i=0;i<entries.length;i+=20){record({phase:"upload_intent",offset:i,count:Math.min(20,entries.length-i)});await vm.writeFiles(entries.slice(i,i+20));record({phase:"upload_observed",offset:i});}
    await run("bash",["-c","ln -s /runtime/node_modules /reference/node_modules; chown -R root:root /reference; find /reference -type d -exec chmod555 {} +".replace("chmod555","chmod 555")+"; find /reference -type f -exec chmod 444 {} +"]);
    const child=`const fs=require('node:fs');(async()=>{const status=fs.readFileSync('/proc/self/status','utf8');let writeCode=null;try{fs.mkdirSync('/reference/source-cloud-boundary-probe')}catch(e){writeCode=e.code}let networkCode=null;try{await fetch('https://example.com',{signal:AbortSignal.timeout(2500)});networkCode='UNEXPECTED_RESPONSE'}catch(e){networkCode=e.cause?.code??e.code??e.name}let runtimeWritable=true;try{fs.accessSync('/runtime/node_modules',fs.constants.W_OK)}catch{runtimeWritable=false}console.log(JSON.stringify({uid:process.getuid(),gid:process.getgid(),groups:process.getgroups(),status,writeCode,networkCode,runtimeWritable,sensitiveKeys:Object.keys(process.env).filter(k=>/SECRET|TOKEN|PASSWORD|API_KEY|DATABASE_URL/.test(k))}));})();`;
    const probe=`const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto');const m=JSON.parse(fs.readFileSync('/reference/source-execution-context.json'));for(const f of m.files){const p='/reference/'+f.path,s=fs.lstatSync(p);if(s.uid!==0||(s.mode&146)||s.size!==f.bytes||crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==f.sha256)throw Error('reference integrity');}const c=cp.spawnSync(process.execPath,['-e',${JSON.stringify(child)}],{uid:1001,gid:1001,env:{PATH:'/usr/local/bin:/usr/bin:/bin',HOME:'/tmp'},encoding:'utf8',timeout:8000});if(c.status!==0)throw Error('child probe failed');console.log(JSON.stringify({node:process.versions.node,uid:process.getuid(),status:fs.readFileSync('/proc/self/status','utf8'),referenceFiles:m.files.length,child:JSON.parse(c.stdout)}));`;
    const raw=await run("setpriv",["--bounding-set=-all,+setuid,+setgid","--inh-caps=-all","--ambient-caps=-all","--no-new-privs","env","-i","PATH=/usr/local/bin:/usr/bin:/bin","node","-e",probe],12000);
    const boundary=JSON.parse(raw);writeExclusive(path.join(evidence,"boundary-observation.json"),boundary);
    assert.equal(boundary.node,PARENT_SOURCE_SNAPSHOT.node);assert.equal(boundary.uid,0);assert.match(boundary.status,/CapEff:\s*00000000000000c0/);assert.match(boundary.status,/NoNewPrivs:\s*1/);
    assert.equal(boundary.child.uid,1001);assert.equal(boundary.child.gid,1001);assert.match(boundary.child.status,/CapEff:\s*0000000000000000/);assert.match(boundary.child.status,/CapPrm:\s*0000000000000000/);assert.match(boundary.child.status,/NoNewPrivs:\s*1/);assert.ok(["EACCES","EROFS"].includes(boundary.child.writeCode));assert.ok(["EAI_AGAIN","EACCES","ENETUNREACH","ECONNREFUSED"].includes(boundary.child.networkCode));assert.equal(boundary.child.runtimeWritable,false);assert.deepEqual(boundary.child.sensitiveKeys,[]);
    record({phase:"snapshot_intent",sourceHash:manifest.snapshotHash});const snapshot=await vm.snapshot({expiration:30*24*60*60*1000,signal:AbortSignal.timeout(30000)});assert.equal(snapshot.status,"created");
    const identity={protocol:SOURCE_EXECUTION_PROTOCOL,engine:"vercel-sandbox",snapshotId:snapshot.snapshotId,snapshotHash:manifest.snapshotHash,runnerHash:manifest.runnerHash,suiteHash:manifest.suiteHash,adapterHash:manifest.adapterHash,dependencyHash:manifest.dependencyHash};
    final={schema:"fracture.source-cloud-build/v1",identity,snapshotExpiresAt:snapshot.expiresAt?.toISOString(),parent:PARENT_SOURCE_SNAPSHOT,boundary,networkPolicy:"deny-all",dependencyInstallations:0,importedCodeExecutions:0,providerCalls:0,modelCalls:0};record({phase:"snapshot_observed",snapshotId:snapshot.snapshotId});
  }catch(error){writeExclusive(path.join(evidence,"build-failure.json"),{at:new Date().toISOString(),name,error:error instanceof Error?error.message:"unknown",outcome:"retained; no automatic build or command retry"});throw error;}
  finally{
    if(intent){try{vm??=await Sandbox.get({...auth,fetch,name,resume:false,signal:AbortSignal.timeout(10000)});if(!["stopped","failed","aborted"].includes(vm.status))await vm.stop({signal:AbortSignal.timeout(15000)});const state=await Sandbox.get({...auth,fetch,name,resume:false,signal:AbortSignal.timeout(10000)});record({phase:"disposal_observed",status:state.status});assert.ok(["stopped","failed","aborted"].includes(state.status));}catch(error){record({phase:"disposal_unknown"});fs.closeSync(fd);throw error;}}
    fs.closeSync(fd);
  }
  writeExclusive(path.join(evidence,"snapshot.json"),final);return final;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [mode,input,evidence]=process.argv.slice(2);assert.ok(input&&evidence&&path.isAbsolute(input)&&path.isAbsolute(evidence));
  if(mode==="--prepare"){const root=fs.realpathSync(path.resolve(fileURLToPath(new URL("..",import.meta.url))));const r=prepareCloudSourceReference(root,input,evidence);console.log(JSON.stringify({directory:r.directory,snapshotHash:r.manifest.snapshotHash,runnerHash:r.manifest.runnerHash}));}
  else if(mode==="--build"){const r=await buildCloudSourceReference(input,evidence);console.log(JSON.stringify(r));}else throw Error("Use --prepare <qualified public context> <evidence> or separately authorized --build <prepared context> <evidence>.");
}
