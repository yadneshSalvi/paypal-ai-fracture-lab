import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {canonical,digest} from '../packages/evaluation/src/protocol';

const root=resolve(import.meta.dirname,'..'),lock=join(root,'evaluation/runtime-lock'),build=join(root,'.artifacts/evaluation-build');
await mkdir(lock,{recursive:true});await rm(build,{recursive:true,force:true});await mkdir(join(build,'runtime'),{recursive:true});
const packageJson={name:'fracture-evaluation-runtime',private:true,version:'1.0.0',type:'module',dependencies:{paypal:'git+https://github.com/context-plugins/paypal-typescript-sdk.git#5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2',typescript:'5.9.3','@types/node':'22.18.10'}};
if(process.argv.includes('--update-lock')){
  await writeFile(join(lock,'package.json'),JSON.stringify(packageJson,null,2)+'\n');await writeFile(join(build,'npm.empty'),'');
  const env:NodeJS.ProcessEnv={NODE_ENV:'development',PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',npm_config_userconfig:join(build,'npm.empty'),npm_config_globalconfig:'/dev/null',npm_config_cache:join(build,'npm-cache'),npm_config_registry:'https://registry.npmjs.org'};
  execFileSync('npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{cwd:lock,env,stdio:['ignore','pipe','pipe'],timeout:180000});
  await cp(join(root,'apps/fixtures/tandem/requirements.txt'),join(lock,'requirements.txt'));
  await rm(join(build,'npm-cache'),{recursive:true,force:true});
}
for(const name of ['package.json','package-lock.json','requirements.txt'])await cp(join(lock,name),join(build,name));
for(const name of await readdir(join(root,'packages/evaluation/runtime')))await cp(join(root,'packages/evaluation/runtime',name),join(build,name==='Dockerfile'?name:join('runtime',name)));
for(const name of ['api.ts','api.py'])await cp(join(root,'evaluation/corpus/shared',name),join(build,name));
const inputs:Record<string,string>={};
for(const name of ['package.json','package-lock.json','requirements.txt','Dockerfile','api.ts','api.py',...(await readdir(join(build,'runtime'))).map(n=>`runtime/${n}`)])inputs[name]=digest(await readFile(join(build,name)));
const snapshotHash=digest(canonical(inputs)),tag=`fracture-evaluation:1-${snapshotHash.slice(0,12)}`;
const env:NodeJS.ProcessEnv={NODE_ENV:'production',PATH:process.env.PATH??'/usr/local/bin:/usr/bin:/bin',DOCKER_CONFIG:process.env.DOCKER_CONFIG??join(homedir(),'.docker')};
execFileSync('docker',['--context','colima-fracture-lab','build','--tag',tag,'--file',join(build,'Dockerfile'),build],{cwd:root,env,stdio:'inherit',timeout:900000});
const inspect=JSON.parse(execFileSync('docker',['--context','colima-fracture-lab','image','inspect',tag],{env,encoding:'utf8'}))[0] as {Id:string;Architecture:string;Os:string};
const manifest={schemaVersion:1,imageId:inspect.Id,tag,snapshotHash,inputs,architecture:inspect.Architecture,os:inspect.Os,context:'colima-fracture-lab',baseImage:'node:22.22.3-bookworm-slim@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752',createdAt:new Date().toISOString(),realCredentials:false,network:'none',gradingBoundary:'Trusted external evaluator; candidate SDK wire and SQL capabilities only.'};
await writeFile(join(lock,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({stage:'image_prepared',imageId:manifest.imageId,snapshotHash,realCredentials:false}));
