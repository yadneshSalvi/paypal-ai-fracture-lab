import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {canonical,digest,type Protocol} from './protocol';
import type {Assignment} from './schedule';

export const toolDefinitions=[
  {type:'function',name:'list_files',description:'List the explicit frozen workspace. Types are under types/paypal/. No files outside this list are accessible.',parameters:{type:'object',properties:{prefix:{type:'string'},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:150}},required:['prefix','offset','limit'],additionalProperties:false}},
  {type:'function',name:'read_file',description:'Read a line-numbered excerpt of a frozen file. Use the exact path returned by list_files or search_files.',parameters:{type:'object',properties:{path:{type:'string'},startLine:{type:'integer',minimum:1},lineCount:{type:'integer',minimum:1,maximum:500}},required:['path','startLine','lineCount'],additionalProperties:false}},
  {type:'function',name:'search_files',description:'Find a literal string in allowed frozen files. Search does not interpret regular expressions or access the host filesystem.',parameters:{type:'object',properties:{query:{type:'string',minLength:1,maxLength:180},prefix:{type:'string'},offset:{type:'integer',minimum:0}},required:['query','prefix','offset'],additionalProperties:false}},
  {type:'function',name:'inspect_baseline',description:'Return the executed original baseline public compile, policy and visible-test receipt. This cannot execute edited drafts or show hidden tests.',parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
] as const;
export const submissionSchema={type:'object',properties:{source:{type:'string'},summary:{type:'string'}},required:['source','summary'],additionalProperties:false};
export interface WorkspaceFile {alias:string;path:string;sha256:string;text:string}
export class ModelWorkspace {
  private constructor(readonly system:string,readonly prompt:string,readonly files:WorkspaceFile[],readonly baseline:unknown,readonly maximumCharacters:number){}
  static async load(root:string,p:Protocol,row:Assignment){
    const task=p.tasks.find(t=>t.id===row.taskId);if(!task)throw new Error('Unscheduled task.');
    const language=task.language==='TypeScript'?'typescript':'python',extension=language==='typescript'?'ts':'py';
    const context=p.contexts.find(c=>c.modelId===row.modelId&&c.language===task.language);if(!context)throw new Error('Missing language-specific context.');
    const files:WorkspaceFile[]=[];
    const added=row.arm==='A'?[]:context[row.arm].files;
    for(const file of [...task.accessibleFiles,task.prompt,...added]){
      const text=await readFile(join(root,file.path),'utf8');if(digest(text)!==file.sha256)throw new Error('A model-accessible frozen file changed.');
      let alias=file.path.startsWith(`evaluation/types/${language}/`)?`types/${file.path.slice(`evaluation/types/${language}/`.length)}`:file.path===task.baselineSource.path?`candidate.${extension}`:file.path===task.prompt.path?'TASK.md':file.path.endsWith('/WORKSPACE.md')?'WORKSPACE.md':file.path.endsWith(`/api.${extension}`)?`api.${extension}`:file.path.endsWith('/public-baseline.json')?'public-baseline.json':added.some(f=>f.path===file.path)?'context/reference.md':file.path;
      if(files.some(f=>f.alias===alias&&f.sha256!==file.sha256))throw new Error('Workspace alias collision.');
      if(!files.some(f=>f.alias===alias))files.push({...file,alias,text});
    }
    const get=(alias:string)=>{const f=files.find(f=>f.alias===alias);if(!f)throw new Error(`Required workspace file is missing: ${alias}`);return f.text;};
    const template=await readFile(join(root,p.promptTemplate.path),'utf8');if(digest(template)!==p.promptTemplate.sha256)throw new Error('Prompt template changed.');
    const system=template+'\n\n'+get('WORKSPACE.md');
    const prompt=`Language: ${task.language}\n\n${get('TASK.md')}\n\n## Supplied workspace API\n${get(`api.${extension}`)}\n\n## Original candidate source\n${get(`candidate.${extension}`)}\n\n${row.arm==='A'?'No additional reference bundle is supplied.':`Additional reference material follows.\n${get('context/reference.md')}\nEnd of additional reference material.`}\n\nOrdinary type declarations are available under types/paypal/. Start with the client and the relevant Orders/Payments types if a signature is uncertain.`;
    return new ModelWorkspace(system,prompt,files,JSON.parse(get('public-baseline.json')),p.execution?.maximumToolResultCharacters??24000);
  }
  describe(){return {systemHash:digest(this.system),promptHash:digest(this.prompt),accessibleFiles:this.files.map(({alias,path,sha256})=>({alias,path,sha256})),accessManifestHash:digest(canonical(this.files.map(({alias,sha256})=>({alias,sha256}))))};}
  execute(name:string,args:Record<string,unknown>){
    let result:unknown;
    if(!args||typeof args!=='object'||Array.isArray(args))return {error:'INVALID_ARGUMENTS'};
    if(name==='inspect_baseline'){if(Object.keys(args).length)return {error:'INVALID_ARGUMENTS'};result=this.baseline;}
    else if(name==='list_files'){
      if(typeof args.prefix!=='string'||!Number.isInteger(args.offset)||Number(args.offset)<0||!Number.isInteger(args.limit)||Number(args.limit)<1||Number(args.limit)>150)return {error:'INVALID_ARGUMENTS'};
      const selected=this.files.filter(f=>f.alias.startsWith(args.prefix as string)).map(f=>({path:f.alias,lines:f.text.split('\n').length,sha256:f.sha256})).sort((a,b)=>a.path.localeCompare(b.path));
      result={files:selected.slice(Number(args.offset),Number(args.offset)+Number(args.limit)),total:selected.length,nextOffset:Number(args.offset)+Number(args.limit)<selected.length?Number(args.offset)+Number(args.limit):null};
    }else if(name==='read_file'){
      if(typeof args.path!=='string'||!Number.isInteger(args.startLine)||Number(args.startLine)<1||!Number.isInteger(args.lineCount)||Number(args.lineCount)<1||Number(args.lineCount)>500)return {error:'INVALID_ARGUMENTS'};
      const file=this.files.find(f=>f.alias===args.path);if(!file)return {error:'FILE_NOT_ALLOWED'};
      const lines=file.text.split('\n'),start=Number(args.startLine)-1;result={path:file.alias,sha256:file.sha256,totalLines:lines.length,startLine:start+1,content:lines.slice(start,start+Number(args.lineCount)).map((line,i)=>`${start+i+1}: ${line}`).join('\n')};
    }else if(name==='search_files'){
      if(typeof args.query!=='string'||args.query.length<1||args.query.length>180||typeof args.prefix!=='string'||!Number.isInteger(args.offset)||Number(args.offset)<0)return {error:'INVALID_ARGUMENTS'};
      const hits:Array<{path:string;line:number;text:string}>=[];
      for(const file of this.files.filter(f=>f.alias.startsWith(args.prefix as string)))for(const [i,line] of file.text.split('\n').entries())if(line.includes(args.query))hits.push({path:file.alias,line:i+1,text:line.slice(0,1000)});
      result={matches:hits.slice(Number(args.offset),Number(args.offset)+60),total:hits.length,nextOffset:Number(args.offset)+60<hits.length?Number(args.offset)+60:null};
    }else return {error:'TOOL_NOT_ALLOWED'};
    const text=JSON.stringify(result);return text.length<=this.maximumCharacters?result:{truncated:true,maximumCharacters:this.maximumCharacters,excerpt:text.slice(0,this.maximumCharacters),instruction:'Request a narrower page or file excerpt.'};
  }
}
