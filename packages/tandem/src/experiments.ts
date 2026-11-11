import { randomUUID } from 'node:crypto';
import { canonicalJson, sha256 } from '@fracture/paypal-core';
import type { SqlConnection, SqlDatabase } from '@fracture/paypal-core';
import { LabError } from '../../service/src/errors';
import type { TandemInvocation } from './local';
import { TandemStore } from './store';
import { tandemSource } from './source';
import { transactionDatabase } from './sql';

export const tandemScenarios = [
  {id:'lost-answer',title:'The answer disappears',description:'The capture commits. Its response never reaches the checkout.',faults:['drop_capture_once'],action:'checkout'},
  {id:'pending',title:'Still processing',description:'A pending capture must not become a paid ticket.',faults:['capture_pending'],action:'checkout'},
  {id:'unavailable-read',title:'Recovery is unavailable',description:'The capture response is lost, and the original resource cannot yet be read.',faults:['drop_capture_once','unavailable_read'],action:'checkout'},
  {id:'lost-create',title:'An order without an answer',description:'Order creation commits, but its identifier is unknown to the application.',faults:['drop_create_once'],action:'checkout'},
  {id:'clean',title:'An ordinary evening',description:'A clean purchase establishes the baseline for both revisions.',faults:[],action:'checkout'},
  {id:'reservation',title:'The reservation lifecycle',description:'Reserve $48, capture a $30 deposit, release $18, then refund the deposit.',faults:[],action:'reserve'},
] as const;
export type TandemScenarioId=typeof tandemScenarios[number]['id'];
export type TandemRevision='faulty'|'hardened';
export interface TandemExperiment {id:string;sessionId:string;requestId:string;scenarioId:TandemScenarioId;manifestHash:string;sourceHash:string;createdAt:string;expiresAt:string;cancelled:boolean;runs:Partial<Record<TandemRevision,string>>}
export interface TandemJob {id:string;experimentId:string;sessionId:string;runId:string;requestId:string;revision:TandemRevision;invocation:TandemInvocation;sourceHash:string;stage:'queued'|'running'|'completed'|'uncertain'|'cancelled';owner:string|null;leaseUntil:string|null;createdAt:string;updatedAt:string;result:Record<string,unknown>|null;workflowId:string|null;lifecycle:Record<string,unknown>[]}
interface DocRow extends Record<string,unknown>{document:unknown}
const value=<T>(row:DocRow):T=>(typeof row.document==='string'?JSON.parse(row.document):row.document) as T;
export const tandemExperimentSchema=[
  `CREATE TABLE IF NOT EXISTS tandem_experiments(id text PRIMARY KEY,session_id text NOT NULL,request_id text NOT NULL,created_at timestamptz NOT NULL,document jsonb NOT NULL,UNIQUE(session_id,request_id))`,
  `CREATE TABLE IF NOT EXISTS tandem_jobs(id text PRIMARY KEY,experiment_id text NOT NULL REFERENCES tandem_experiments(id),session_id text NOT NULL,run_id text NOT NULL REFERENCES tandem_runs(id),request_id text NOT NULL,revision text NOT NULL,stage text NOT NULL,lease_until timestamptz,created_at timestamptz NOT NULL,document jsonb NOT NULL,UNIQUE(experiment_id,revision,request_id))`,
  `CREATE INDEX IF NOT EXISTS tandem_jobs_queue ON tandem_jobs(stage,created_at)`,
];
const terminal=(stage:TandemJob['stage'])=>!['queued','running'].includes(stage);

export class TandemExperiments {
  constructor(readonly db:SqlDatabase){}
  async initialize(){if(this.db.dialect!=='postgres')throw new LabError('TANDEM_POSTGRES_REQUIRED','The durable Python laboratory requires PostgreSQL.',503);await new TandemStore(this.db,'schema','schema').initialize();for(const sql of tandemExperimentSchema)await this.db.query(sql);}
  async experiment(id:string,sessionId:string,tx:SqlConnection=this.db,lock=false){const row=(await tx.query<DocRow>(`SELECT document FROM tandem_experiments WHERE id=$1 AND session_id=$2${lock?' FOR UPDATE':''}`,[id,sessionId])).rows[0];if(!row)throw new LabError('EXPERIMENT_NOT_FOUND','This comparison is not in your session.',404);return value<TandemExperiment>(row);}
  async list(sessionId:string){return (await this.db.query<DocRow>('SELECT document FROM tandem_experiments WHERE session_id=$1 ORDER BY created_at DESC LIMIT 30',[sessionId])).rows.map(row=>value<TandemExperiment>(row));}
  async job(id:string,tx:SqlConnection=this.db,lock=false){const row=(await tx.query<DocRow>(`SELECT document FROM tandem_jobs WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];return row?value<TandemJob>(row):null;}
  async jobs(id:string,tx:SqlConnection=this.db){return (await tx.query<DocRow>('SELECT document FROM tandem_jobs WHERE experiment_id=$1 ORDER BY created_at,id',[id])).rows.map(row=>value<TandemJob>(row));}
  private async saveJob(job:TandemJob,tx:SqlConnection){job.updatedAt=new Date().toISOString();await tx.query('UPDATE tandem_jobs SET document=$2::jsonb,stage=$3,lease_until=$4 WHERE id=$1',[job.id,JSON.stringify(job),job.stage,job.leaseUntil]);}
  private async insertJob(experiment:TandemExperiment,revision:TandemRevision,requestId:string,invocation:TandemInvocation,tx:SqlConnection){
    const runId=experiment.runs[revision];if(!runId)throw new LabError('REVISION_UNAVAILABLE','This scenario has only a hardened reservation target.',409);
    const job:TandemJob={id:randomUUID(),experimentId:experiment.id,sessionId:experiment.sessionId,runId,requestId,revision,invocation,sourceHash:experiment.sourceHash,stage:'queued',owner:null,leaseUntil:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),result:null,workflowId:null,lifecycle:[]};
    await tx.query('INSERT INTO tandem_jobs(id,experiment_id,session_id,run_id,request_id,revision,stage,created_at,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',[job.id,experiment.id,job.sessionId,runId,requestId,revision,job.stage,job.createdAt,JSON.stringify(job)]);return job;
  }
  async create(sessionId:string,scenarioId:TandemScenarioId,requestId:string,sessionExpiresAt:string){
    const scenario=tandemScenarios.find(s=>s.id===scenarioId);if(!scenario)throw new LabError('SCENARIO_NOT_FOUND','Choose a registered scenario.');
    const source=await tandemSource(),manifestHash=sha256(canonicalJson(scenario));
    return this.db.transaction(async tx=>{
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`tandem-session:${sessionId}`]);
      const old=(await tx.query<DocRow>('SELECT document FROM tandem_experiments WHERE session_id=$1 AND request_id=$2',[sessionId,requestId])).rows[0];
      if(old){const experiment=value<TandemExperiment>(old);if(experiment.scenarioId!==scenarioId)throw new LabError('REQUEST_CHANGED','This request identity belongs to a different scenario.',409);return {experiment,jobs:await this.jobs(experiment.id,tx),created:false};}
      if((await tx.query("SELECT id FROM tandem_jobs WHERE session_id=$1 AND stage IN ('queued','running')",[sessionId])).rowCount)throw new LabError('TANDEM_BUSY','Let the current comparison finish, or cancel it before starting another.',409);
      if((await tx.query('SELECT id FROM tandem_experiments WHERE session_id=$1',[sessionId])).rowCount>=30)throw new LabError('TANDEM_SESSION_LIMIT','This session has reached its 30 saved comparisons. Your existing evidence remains available.',429);
      const expiresAt=new Date(Math.min(Date.now()+3600000,Date.parse(sessionExpiresAt))).toISOString();if(Date.parse(expiresAt)<=Date.now())throw new LabError('SESSION_EXPIRED','Start a new workspace session.',401);
      const experiment:TandemExperiment={id:randomUUID(),sessionId,requestId,scenarioId,manifestHash,sourceHash:source.sourceHash,createdAt:new Date().toISOString(),expiresAt,cancelled:false,runs:{}};
      for(const revision of (scenario.action==='reserve'?['hardened']:['faulty','hardened']) as TandemRevision[]){
        const runId=randomUUID();experiment.runs[revision]=runId;
        await new TandemStore(transactionDatabase(tx),sessionId,runId).create({intent:'one-evening-ticket',minor:4800,expiresAt,sourceHash:source.sourceHash,faults:[...scenario.faults]});
      }
      await tx.query('INSERT INTO tandem_experiments(id,session_id,request_id,created_at,document) VALUES($1,$2,$3,$4,$5::jsonb)',[experiment.id,sessionId,requestId,experiment.createdAt,JSON.stringify(experiment)]);
      const jobs:TandemJob[]=[];for(const revision of Object.keys(experiment.runs) as TandemRevision[])jobs.push(await this.insertJob(experiment,revision,'initial',{revision,action:scenario.action},tx));
      return {experiment,jobs,created:true};
    });
  }
  async command(sessionId:string,id:string,input:{requestId:string;revision:TandemRevision;action:'retry'|'capture_deposit'|'release_remainder'|'refund_deposit'|'reconcile';operationKey?:string}){
    return this.db.transaction(async tx=>{
      const experiment=await this.experiment(id,sessionId,tx,true),jobs=await this.jobs(id,tx);
      const old=jobs.find(j=>j.requestId===input.requestId&&j.revision===input.revision);
      if(old){const expected=old.invocation.action==='checkout'?'retry':old.invocation.action==='reconcile'?'reconcile':old.invocation.parameters?.kind==='refund'?'refund_deposit':old.invocation.parameters?.kind==='void'?'release_remainder':'capture_deposit';if(expected!==input.action||input.action==='reconcile'&&old.invocation.parameters?.key!==input.operationKey)throw new LabError('REQUEST_CHANGED','This request identity belongs to a different action.',409);return old;}
      if(jobs.some(j=>!terminal(j.stage)))throw new LabError('TANDEM_BUSY','The previous action is still running. It will remain attached after a refresh.',409);
      if(jobs.length>=24)throw new LabError('TANDEM_ACTION_LIMIT','This comparison has reached its 24 recorded actions.',429);
      if((experiment.cancelled||Date.parse(experiment.expiresAt)<=Date.now())&&input.action!=='reconcile')throw new LabError('TANDEM_AUTHORITY_CLOSED','This comparison is closed. Original uncertain operations can still be inspected.',409);
      const runId=experiment.runs[input.revision];if(!runId)throw new LabError('REVISION_UNAVAILABLE','This scenario has no faulty reservation target.',409);
      const store=new TandemStore(transactionDatabase(tx),sessionId,runId);
      let invocation:TandemInvocation;
      if(input.action==='retry'){
        if(experiment.scenarioId==='reservation')throw new LabError('ACTION_UNAVAILABLE','Continue the reservation using its existing authorization.',409);
        invocation={revision:input.revision,action:'checkout'};
      }else{
        if(input.revision!=='hardened')throw new LabError('ACTION_UNAVAILABLE','Lifecycle and original-operation recovery belong to the hardened target.',409);
        if(input.action==='reconcile'){
          if(!input.operationKey||!(await store.operations(tx)).some(op=>op.key===input.operationKey&&['dispatching','unknown'].includes(op.status)))throw new LabError('ORIGINAL_OPERATION_REQUIRED','Choose an uncertain operation from this exact comparison.',409);
          invocation={revision:'hardened',action:'reconcile',parameters:{key:input.operationKey}};
        }else{
          if(experiment.scenarioId!=='reservation')throw new LabError('ACTION_UNAVAILABLE','This action belongs to the reservation scenario.',409);
          const resources=await store.resources(tx),authorization=resources.find(r=>r.kind==='authorization'),capture=resources.find(r=>r.kind==='capture');
          const kind=input.action==='capture_deposit'?'capture_authorization':input.action==='release_remainder'?'void':'refund';
          const resource=kind==='refund'?capture:authorization;
          if(!resource)throw new LabError('ORIGINAL_RESOURCE_REQUIRED','The original resource has not been observed yet.',409);
          if(kind==='void'&&!capture)throw new LabError('DEPOSIT_REQUIRED','Capture the $30 deposit before releasing the remaining reservation.',409);
          invocation={revision:'hardened',action:'operation',parameters:{key:input.action,kind,resourceId:resource.id,minor:kind==='void'?0:3000}};
        }
      }
      return this.insertJob(experiment,input.revision,input.requestId,invocation,tx);
    });
  }
  async cancel(sessionId:string,id:string){return this.db.transaction(async tx=>{const experiment=await this.experiment(id,sessionId,tx,true);if(!experiment.cancelled){experiment.cancelled=true;await tx.query('UPDATE tandem_experiments SET document=$2::jsonb WHERE id=$1',[id,JSON.stringify(experiment)]);for(const runId of Object.values(experiment.runs))await new TandemStore(transactionDatabase(tx),sessionId,runId).revoke();}for(const job of await this.jobs(id,tx))if(!terminal(job.stage)&&job.invocation.action!=='reconcile'){job.stage=job.stage==='running'?'uncertain':'cancelled';job.result={code:job.stage==='uncertain'?'CANCELLED_WITH_POSSIBLE_EFFECTS':'CANCELLED_BEFORE_DISPATCH'};job.owner=null;job.leaseUntil=null;await this.saveJob(job,tx);}return experiment;});}
  async recoverExpired(){return this.db.transaction(async tx=>{const rows=await tx.query<DocRow>("SELECT document FROM tandem_jobs WHERE stage='running' AND lease_until<=now() FOR UPDATE SKIP LOCKED");for(const row of rows.rows){const job=value<TandemJob>(row);job.stage='uncertain';job.owner=null;job.leaseUntil=null;job.result={code:'WORKER_LEASE_EXPIRED',detail:'The previous invocation may have committed. It will not be automatically dispatched again.'};await this.saveJob(job,tx);}return rows.rowCount;});}
  async claim(id:string){await this.recoverExpired();return this.db.transaction(async tx=>{
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended('tandem-global-workers',0))");
    const candidate=await this.job(id,tx);if(!candidate||candidate.stage!=='queued')return null;
    const experiment=await this.experiment(candidate.experimentId,candidate.sessionId,tx,true),job=await this.job(id,tx,true);if(!job||job.stage!=='queued')return null;
    if(experiment.cancelled&&job.invocation.action!=='reconcile'){job.stage='cancelled';await this.saveJob(job,tx);return null;}
    if((await tx.query("SELECT id FROM tandem_jobs WHERE stage='running' AND lease_until>now()")).rowCount>=3||(await tx.query("SELECT id FROM tandem_jobs WHERE session_id=$1 AND stage='running' AND lease_until>now()",[job.sessionId])).rowCount)return null;
    job.stage='running';job.owner=randomUUID();job.leaseUntil=new Date(Date.now()+90000).toISOString();await this.saveJob(job,tx);return job;
  });}
  fencedStore(job:TandemJob){return new TandemStore(this.db,job.sessionId,job.runId,async tx=>{
    const experiment=await this.experiment(job.experimentId,job.sessionId,tx,true),current=await this.job(job.id,tx,true);
    if(!current||current.stage!=='running'||current.owner!==job.owner||!current.leaseUntil||Date.parse(current.leaseUntil)<=Date.now()||experiment.cancelled&&job.invocation.action!=='reconcile')throw new Error('TANDEM_WORKER_FENCE_CLOSED');
  });}
  async finish(job:TandemJob,result:Record<string,unknown>,uncertain=false){return this.db.transaction(async tx=>{await this.experiment(job.experimentId,job.sessionId,tx,true);const current=await this.job(job.id,tx,true);if(!current||current.owner!==job.owner||current.stage!=='running'||!current.leaseUntil||Date.parse(current.leaseUntil)<=Date.now())return false;current.stage=uncertain?'uncertain':'completed';current.result=result;current.owner=null;current.leaseUntil=null;await this.saveJob(current,tx);return true;});}
  async lifecycle(id:string,proof:Record<string,unknown>){await this.db.transaction(async tx=>{const job=await this.job(id,tx,true);if(!job)return;job.lifecycle.push(proof);await this.saveJob(job,tx);});}
  async workflow(id:string,workflowId:string){await this.db.transaction(async tx=>{const job=await this.job(id,tx,true);if(job){job.workflowId=workflowId;await this.saveJob(job,tx);}});}
  async pending(){return (await this.db.query<{id:string}&Record<string,unknown>>("SELECT id FROM tandem_jobs WHERE stage IN ('queued','running') ORDER BY created_at LIMIT 40")).rows.map(r=>r.id);}
  async detail(sessionId:string,id:string){return this.db.transaction(async tx=>{
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const experiment=await this.experiment(id,sessionId,tx),runs:Partial<Record<TandemRevision,Awaited<ReturnType<TandemStore['snapshot']>>>>={};
    for(const revision of Object.keys(experiment.runs) as TandemRevision[])runs[revision]=await new TandemStore(transactionDatabase(tx),sessionId,experiment.runs[revision]!).snapshot();
    return {experiment,jobs:await this.jobs(id,tx),runs};
  });}
}
