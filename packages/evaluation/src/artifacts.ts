import {open,mkdir,readFile,readdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {canonical,digest} from './protocol';

export async function saveNew(path:string,value:unknown){
  await mkdir(dirname(path),{recursive:true,mode:0o700});const file=await open(path,'wx',0o600);
  try{const json=JSON.stringify(value,null,2)+'\n';await file.writeFile(path.endsWith('.gz')?gzipSync(json,{level:9}):json);await file.sync();}finally{await file.close();}
  const directory=await open(dirname(path),'r');try{await directory.sync();}finally{await directory.close();}
}
export async function readJson<T=Record<string,any>>(path:string):Promise<T>{const bytes=await readFile(path);return JSON.parse((path.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8')) as T;}
export async function optionalJson<T=Record<string,any>>(path:string):Promise<T|null>{try{return await readJson<T>(path);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
export async function recursiveFiles(path:string):Promise<string[]>{const out:string[]=[];for(const item of await readdir(path,{withFileTypes:true})){const full=join(path,item.name);if(item.isDirectory())out.push(...await recursiveFiles(full));else if(item.isFile())out.push(full);else throw new Error('Study artifacts must be ordinary files.');}return out.sort();}
export function verifyReceipt<T extends Record<string,any>>(value:T){const {receiptHash,...body}=value;if(typeof receiptHash!=='string'||digest(canonical(body))!==receiptHash)throw new Error('Receipt content hash does not match.');return value;}
