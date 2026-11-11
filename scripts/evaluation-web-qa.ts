import {spawn} from 'node:child_process';
import {readFile,writeFile,open,mkdir,unlink,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
import pg from 'pg';

const root=resolve(import.meta.dirname,'..'),environment=parse(await readFile(join(root,'.env'),'utf8'));
const mode=process.argv.includes('--build')?'build':process.argv.includes('--test')?'tests':'qa';
const metadataPath=join(root,`.artifacts/evaluation-web-${mode}-active.json`),receiptPath=join(root,`.artifacts/evaluation-web-${mode}-receipt.json`);
let prior:Record<string,any>|null=null;try{prior=JSON.parse(await readFile(metadataPath,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
if(prior){let active=true;try{process.kill(Number(prior.pid),0);}catch(error){if((error as NodeJS.ErrnoException).code==='ESRCH')active=false;else throw error;}if(active)throw new Error('The evaluation QA server is already active.');if(!/^fracture_evaluation_ui_[a-f0-9]{20}$/.test(String(prior.schema)))throw new Error('Unexpected prior QA schema.');}
const database=new pg.Client({connectionString:environment.DATABASE_URL});await database.connect();
if(prior){await database.query(`DROP SCHEMA IF EXISTS "${prior.schema}" CASCADE`);await unlink(metadataPath);}
if(process.argv.includes('--cleanup')){await database.end();console.log(JSON.stringify({qaSchemaCleanup:true}));process.exit(0);}
const schema=`fracture_evaluation_ui_${randomBytes(10).toString('hex')}`,connection=new URL(environment.DATABASE_URL!);connection.searchParams.set('options',`-c search_path=${schema}`);
await database.query(`CREATE SCHEMA "${schema}"`);await mkdir(join(root,'.artifacts'),{recursive:true});
const startedAt=new Date().toISOString(),logPath=join(root,'.artifacts',`evaluation-web-qa-${startedAt.replaceAll(':','-')}.log`),log=await open(logPath,'wx',0o600);
const childEnv={...process.env,...environment,DATABASE_URL:connection.href,FRACTURE_WORKSPACE_ROOT:root,FRACTURE_EVALUATION_QA:mode==='build'?'build':'1',WORKFLOW_LOCAL_DATA_DIR:join(root,`.artifacts/evaluation-web-${mode}-workflow`),PAYPAL_CLIENT_ID:'',PAYPAL_CLIENT_SECRET:'',OPENAI_API_KEY:mode==='tests'?'OFFLINE_TEST_ONLY_PLACEHOLDER':'',GEMINI_API_KEY:mode==='tests'?'OFFLINE_TEST_ONLY_PLACEHOLDER':''};
let child:ReturnType<typeof spawn>|undefined,stopping=false;
const stop=()=>{stopping=true;child?.kill('SIGTERM');};process.on('SIGTERM',stop);process.on('SIGINT',stop);
async function command(args:string[],cwd=root){
  child=spawn(process.execPath,args,{cwd,env:childEnv,stdio:['ignore',log.fd,log.fd]});
  return await new Promise<number>((resolve,reject)=>{child!.once('error',reject);child!.once('exit',code=>resolve(code??1));});
}
let exitCode=1;
try{
  await writeFile(metadataPath,JSON.stringify({pid:process.pid,schema,port:mode==='qa'?4504:null,startedAt,log:logPath,originalTablesTouched:false},null,2)+'\n',{flag:'wx',mode:0o600});
  const migrated=await command(['--import','tsx','scripts/migrate.ts']);if(migrated!==0)throw new Error('QA schema initialization failed; inspect its private log.');
  if(process.argv.includes('--test'))exitCode=await command(['--import','tsx','--test',...(await readdir(join(root,'tests'))).filter(name=>name.endsWith('.test.ts')).sort().map(name=>`tests/${name}`)]);
  else if(process.argv.includes('--build'))exitCode=await command([join(root,'node_modules/next/dist/bin/next'),'build'],join(root,'apps/web'));
  else {
    const running=command([join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','4504'],join(root,'apps/web'));
    console.log(JSON.stringify({stage:'qa_server_starting',url:'http://localhost:4504/evaluations',schema,log:logPath,providerKeysForwarded:false}));
    exitCode=await running;
  }
}finally{
  await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await database.end();await log.close();await unlink(metadataPath);
  await writeFile(receiptPath,JSON.stringify({schema,startedAt,finishedAt:new Date().toISOString(),exitCode,stopped:stopping,originalTablesTouched:false,qaSchemaRemoved:true,log:logPath},null,2)+'\n',{mode:0o600});
}
if(!stopping)process.exitCode=exitCode;
