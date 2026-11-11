import {createInterface} from 'node:readline';
import {mkdir,writeFile,copyFile,symlink} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {sourcePolicy} from './policy.mjs';
import {decodeFrame} from './channel.mjs';

const send=frame=>process.stdout.write(JSON.stringify(frame)+'\n');
const env={PATH:'/runtime/venv/bin:/usr/local/bin:/usr/bin:/bin',HOME:'/tmp',NODE_ENV:'production',PYTHONDONTWRITEBYTECODE:'1',PYTHONPATH:'/tmp/work',PYTHONUNBUFFERED:'1'};
const children=new Map();let initialized=false,language='',compilePassed=false;
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){
  if(line.length>300000){send({kind:'fatal',code:'INPUT_LIMIT'});break;}
  let frame;try{frame=JSON.parse(line);}catch{send({kind:'fatal',code:'INVALID_FRAME'});break;}
  if(frame.kind==='init'&&!initialized){
    initialized=true;language=frame.language;
    if(!['TypeScript','Python'].includes(language)||typeof frame.source!=='string'||Buffer.byteLength(frame.source)>120000)throw new Error('INVALID_SOURCE');
    await mkdir('/tmp/work',{recursive:true});await writeFile('/tmp/work/package.json','{"type":"module"}');await symlink('/runtime/node_modules','/tmp/work/node_modules');
    const extension=language==='TypeScript'?'ts':'py';await writeFile(`/tmp/work/candidate.${extension}`,frame.source);await copyFile(`/runtime/api.${extension}`,`/tmp/work/api.${extension}`);
    const command=language==='TypeScript'?'/usr/local/bin/node':'/runtime/venv/bin/python';
    const args=language==='TypeScript'?['/runtime/node_modules/typescript/bin/tsc','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--strict','--exactOptionalPropertyTypes','--skipLibCheck','--outDir','out','candidate.ts','api.ts']:['-m','mypy','--strict','--no-incremental','--cache-dir','/tmp/mypy-cache','--follow-imports','silent','candidate.py','api.py'];
    const policy=sourcePolicy(frame.source,language);
    const check=spawnSync(command,args,{cwd:'/tmp/work',env,encoding:'utf8',timeout:45000,maxBuffer:100000});compilePassed=check.status===0;
    send({kind:'ready',compilePassed,policy,sourceHash:createHash('sha256').update(frame.source).digest('hex'),diagnostics:`${check.stdout??''}${check.stderr??''}`.slice(0,14000),runtime:language==='TypeScript'?process.version:'python3.11',errorCode:check.error?.code??null});
    compilePassed=compilePassed&&policy.passed;
  }else if(frame.kind==='invoke'&&compilePassed){
    if(typeof frame.id!=='string'||children.has(frame.id)||children.size>=4){send({kind:'fatal',code:'INVOCATION_LIMIT'});break;}
    const args=language==='TypeScript'?['/runtime/worker.mjs']:['/runtime/worker.py'];
    const bridgeSecret=randomBytes(32).toString('hex');
    const child=spawn(language==='TypeScript'?'/usr/local/bin/node':'/runtime/venv/bin/python',args,{cwd:'/tmp/work',env,stdio:['pipe','pipe','pipe','pipe']});
    const slot={child,ended:false,bytes:0,lastCall:0,timer:null};children.set(frame.id,slot);
    const finish=(result)=>{if(slot.ended)return;slot.ended=true;clearTimeout(slot.timer);children.delete(frame.id);child.kill('SIGKILL');send({kind:'return',invocationId:frame.id,...result});};
    slot.timer=setTimeout(()=>finish({error:{code:'TARGET_TIMEOUT'}}),12000);
    // Stdout is diagnostic only. Authenticated descriptor 3 frames come from the
    // trusted bridge; a fresh per-worker key never enters the target context.
    const output=createInterface({input:child.stdio[3],crlfDelay:Infinity});
    output.on('line',text=>{slot.bytes+=Buffer.byteLength(text);if(slot.bytes>200000){finish({error:{code:'TARGET_OUTPUT_LIMIT'}});return;}const message=decodeFrame(text,bridgeSecret);if(!message){finish({error:{code:'TARGET_PROTOCOL_AUTHENTICATION'}});return;}
      if(message.kind==='rpc'&&Number.isInteger(message.id)&&message.id===slot.lastCall+1&&typeof message.method==='string'&&message.input&&typeof message.input==='object'){slot.lastCall=message.id;send({kind:'rpc',invocationId:frame.id,id:message.id,method:message.method,input:message.input});}
      else if(message.kind==='return')finish(message.error?{error:message.error}:{value:message.value});else finish({error:{code:'TARGET_PROTOCOL'}});
    });
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{slot.bytes+=chunk.length;if(slot.bytes>200000)finish({error:{code:'TARGET_OUTPUT_LIMIT'}});});
    child.on('error',()=>finish({error:{code:'TARGET_PROCESS_ERROR'}}));child.on('close',code=>{if(!slot.ended)finish({error:{code:'TARGET_EXIT',exitCode:code}});});child.stdin.on('error',()=>{});child.stdin.write(JSON.stringify({command:frame.command,bridgeSecret})+'\n');
  }else if(frame.kind==='reply'){
    const slot=children.get(frame.invocationId);if(slot&&!slot.ended)slot.child.stdin.write(JSON.stringify({id:frame.id,...(frame.error?{error:frame.error}:{value:frame.value})})+'\n');
  }else if(frame.kind==='finish')break;
  else {send({kind:'fatal',code:'INVALID_PHASE'});break;}
}
for(const {child,timer} of children.values()){clearTimeout(timer);child.kill('SIGKILL');}
process.stdin.destroy();
