import {execFileSync,spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {digest} from './protocol';
import {EvaluationWorld,StoreFailure,type Data} from './world';

export interface RuntimeManifest {schemaVersion:number;imageId:string;snapshotHash:string;context:string}
export interface Ready {kind:'ready';sourceHash:string;compilePassed:boolean;policy:{passed:boolean;findings:Array<{line:number;code:string}>};diagnostics:string;runtime:string;errorCode:string|null}
export interface TargetResult {value?:Data;error?:{code:string;message?:string}}
export class InfrastructureFailure extends Error {readonly code='runner_unavailable';}
const prefix=['--context','colima-fracture-lab'];
const dockerEnv=():NodeJS.ProcessEnv=>({NODE_ENV:'production',PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',DOCKER_CONFIG:process.env.DOCKER_CONFIG??join(homedir(),'.docker')});

/** An anonymous, one-source sandbox. There are no bind mounts, tests or model credentials. */
export class CandidateSandbox {
  readonly receipt:Data;readonly ready:Promise<Ready>;
  private child:ChildProcessWithoutNullStreams;private serial=0;private closed=false;private output=0;private failure:string|null=null;
  private pending=new Map<string,{world:EvaluationWorld;resolve:(result:TargetResult)=>void}>();
  private rejectReady:(error:Error)=>void=()=>{};private timer:ReturnType<typeof setTimeout>;
  private constructor(private id:string,private name:string,manifest:RuntimeManifest,inspection:Data,source:string,language:'TypeScript'|'Python'){
    this.receipt={schemaVersion:1,containerId:id,imageId:manifest.imageId,snapshotHash:manifest.snapshotHash,sourceHash:digest(source),language,networkMode:inspection.HostConfig.NetworkMode,readOnlyRoot:inspection.HostConfig.ReadonlyRootfs,mountCount:inspection.Mounts.length,user:inspection.Config.User,memoryBytes:inspection.HostConfig.Memory,pidsLimit:inspection.HostConfig.PidsLimit,nanoCpus:inspection.HostConfig.NanoCpus,temporaryFilesystem:inspection.HostConfig.Tmpfs['/tmp'],capabilitiesDropped:inspection.HostConfig.CapDrop,securityOptions:inspection.HostConfig.SecurityOpt,credentialEnvironmentForwarded:false,hiddenTestsInsideContainer:false,startedAt:new Date().toISOString()};
    this.child=spawn('docker',[...prefix,'start','--attach','--interactive',id],{env:dockerEnv(),stdio:['pipe','pipe','pipe']});
    this.ready=new Promise((resolve,reject)=>{this.rejectReady=reject;const lines=createInterface({input:this.child.stdout,crlfDelay:Infinity});
      lines.on('line',line=>{this.output+=Buffer.byteLength(line);if(this.output>8000000){this.fail(new Error('OUTPUT_LIMIT'));return;}let message:Data;try{message=JSON.parse(line) as Data;}catch{this.fail(new Error('RUNTIME_PROTOCOL'));return;}
        if(message.kind==='ready'){if(message.sourceHash!==digest(source)){this.fail(new InfrastructureFailure('Source hash mismatch at the sandbox boundary.'));return;}resolve(message as Ready);}
        else if(message.kind==='rpc'){const slot=this.pending.get(String(message.invocationId));if(!slot)return;void slot.world.rpc(String(message.invocationId),String(message.method),message.input as Data).then(value=>this.send({kind:'reply',invocationId:message.invocationId,id:message.id,value}),error=>this.send({kind:'reply',invocationId:message.invocationId,id:message.id,error:error instanceof StoreFailure?error.code:'CAPABILITY_FAILURE'}));}
        else if(message.kind==='return'){const slot=this.pending.get(String(message.invocationId));if(slot){this.pending.delete(String(message.invocationId));slot.resolve(message.error?{error:message.error}:{value:message.value});}}
        else this.fail(new Error(String(message.code??'RUNTIME_PROTOCOL')));
      });
    });
    this.child.stderr.on('data',chunk=>{this.output+=chunk.length;if(this.output>8000000)this.fail(new Error('OUTPUT_LIMIT'));});
    this.child.on('error',()=>this.fail(new InfrastructureFailure('Docker could not attach the verified container.')));
    this.child.on('close',()=>{if(!this.closed)this.fail(new Error('SANDBOX_EXIT'));});this.child.stdin.on('error',()=>{});
    this.timer=setTimeout(()=>this.fail(new Error('SANDBOX_DEADLINE')),175000);this.send({kind:'init',source,language});
  }
  static async open(root:string,source:string,language:'TypeScript'|'Python'){
    const manifest=JSON.parse(await readFile(join(root,'evaluation/runtime-lock/manifest.json'),'utf8')) as RuntimeManifest;
    if(!/^sha256:[a-f0-9]{64}$/.test(manifest.imageId)||manifest.context!=='colima-fracture-lab')throw new InfrastructureFailure('The evaluation runtime is not prepared.');
    const name=`fracture-evaluation-${randomUUID()}`;let id='';
    try{
      id=execFileSync('docker',[...prefix,'create','--interactive','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','96','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=128m','--user','1000:1000',manifest.imageId],{env:dockerEnv(),encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
      const i=JSON.parse(execFileSync('docker',[...prefix,'inspect',id],{env:dockerEnv(),encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}))[0] as Data;const h=i.HostConfig;
      if(h.NetworkMode!=='none'||!h.ReadonlyRootfs||i.Mounts.length||h.Binds?.length||i.Config.User!=='1000:1000'||i.Image!==manifest.imageId||h.Memory!==536870912||h.PidsLimit!==96||h.NanoCpus!==1000000000||!h.CapDrop.includes('ALL')||!h.SecurityOpt.some((s:string)=>s.startsWith('no-new-privileges'))||!['nosuid','nodev','noexec','size=128m'].every(s=>h.Tmpfs['/tmp']?.split(',').includes(s))||i.Config.Env.some((s:string)=>/(?:API_KEY|SECRET|DATABASE_URL|PAYPAL_)/i.test(s)))throw new InfrastructureFailure('The inspected container does not satisfy the frozen isolation policy.');
      return new CandidateSandbox(id,name,manifest,i,source,language);
    }catch(error){if(id)try{execFileSync('docker',[...prefix,'rm','--force',id],{env:dockerEnv(),stdio:'ignore',timeout:10000});}catch{}throw error instanceof InfrastructureFailure?error:new InfrastructureFailure('The verified Docker runtime is unavailable.');}
  }
  private send(frame:Data){if(!this.closed)this.child.stdin.write(JSON.stringify(frame)+'\n');}
  invoke(world:EvaluationWorld,command:Data):Promise<TargetResult>{if(this.closed||this.failure)return Promise.resolve({error:{code:this.failure??'SANDBOX_CLOSED'}});const id=`call-${++this.serial}`;return new Promise(resolve=>{this.pending.set(id,{world,resolve});this.send({kind:'invoke',id,command});});}
  private fail(error:Error){if(this.failure)return;this.failure=error.message;this.rejectReady(error);for(const slot of this.pending.values())slot.resolve({error:{code:error.message}});this.pending.clear();this.receipt.runtimeFailure=error.message;this.child.kill('SIGKILL');}
  close(){if(this.closed)return;this.send({kind:'finish'});this.closed=true;clearTimeout(this.timer);this.child.kill('SIGKILL');for(const slot of this.pending.values())slot.resolve({error:{code:'SANDBOX_CLOSED'}});this.pending.clear();try{execFileSync('docker',[...prefix,'rm','--force',this.id],{env:dockerEnv(),timeout:10000,stdio:'ignore'});}catch{this.receipt.cleanupPending=this.name;}this.receipt.finishedAt=new Date().toISOString();}
}
