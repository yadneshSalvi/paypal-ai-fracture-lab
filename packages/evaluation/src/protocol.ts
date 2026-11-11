import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import {z} from 'zod';

export const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
export function canonical(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const file=z.object({path:z.string().min(1),sha256:hash}).strict();
export const families=['D1','D2','D3','D4','D5'] as const;
export const arms=['A','B','C'] as const;
export const languages=['TypeScript','Python'] as const;
const task=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]+$/),family:z.enum(families),language:z.enum(languages),split:z.enum(['development','held_out']),prompt:file,
  accessibleFiles:z.array(file).min(1),hiddenTests:z.array(file).min(1),controlProof:file,baselineSource:file,hardenedSource:file}).strict();
const context=z.object({modelId:z.string(),tokenizer:z.string().min(1),tokenizationReceipt:file,tokenBudget:z.number().int().positive(),
  B:z.object({files:z.array(file).min(1),tokens:z.number().int().positive()}).strict(),
  C:z.object({files:z.array(file).min(1),tokens:z.number().int().positive()}).strict()}).strict();
export const protocolSchema=z.object({schemaVersion:z.literal(1),id:z.string().regex(/^[a-zA-Z0-9_-]+$/),createdAt:z.iso.datetime(),
  tasks:z.array(task).length(20),models:z.array(z.object({id:z.string().min(1),provider:z.enum(['openai','gemini']),version:z.string().min(1),verifiedAt:z.iso.datetime(),
    settings:z.record(z.string(),z.union([z.string(),z.number(),z.boolean(),z.null()])),honorsSeed:z.boolean()}).strict()).length(2),
  repeats:z.literal(5),seedLabels:z.array(z.string().min(1)).length(5),arms:z.tuple([z.literal('A'),z.literal('B'),z.literal('C')]),
  contexts:z.array(context).length(2),promptTemplate:file,evaluatorFiles:z.array(file).min(1),runnerManifest:file,
  maximumOutputTokens:z.number().int().positive().max(100000),maximumIterations:z.literal(1),
  infrastructureRetry:z.object({maximumRetries:z.literal(1),retryable:z.tuple([z.literal('provider_429'),z.literal('provider_5xx'),z.literal('transport_before_response'),z.literal('runner_unavailable')])}).strict(),
  statistics:z.object({resamples:z.literal(10000),seed:z.string().min(1),cluster:z.literal('task'),comparisons:z.tuple([z.literal('B-A'),z.literal('B-C')]),
    familywiseAlpha:z.literal(0.05),intervalMethod:z.literal('percentile_task_cluster_bootstrap'),multiplicity:z.literal('bonferroni_two_comparisons')}).strict(),
  limitations:z.array(z.string()).min(1)
}).strict();
export type Protocol=z.infer<typeof protocolSchema>;
export function parseProtocol(input:unknown):Protocol {
  const p=protocolSchema.parse(input);
  if(new Set(p.models.map(m=>m.id)).size!==2||new Set(p.models.map(m=>m.provider)).size!==2)throw new Error('Declare one OpenAI and one Gemini model with distinct identifiers.');
  if(new Set(p.tasks.map(t=>t.id)).size!==20||new Set(p.seedLabels).size!==5)throw new Error('Task identifiers and seed labels must be unique.');
  for(const family of families)for(const language of languages)for(const split of ['development','held_out'])if(p.tasks.filter(t=>t.family===family&&t.language===language&&t.split===split).length!==1)throw new Error('Each family/language needs one development and one held-out task.');
  for(const model of p.models){const bundles=p.contexts.filter(c=>c.modelId===model.id);if(bundles.length!==1)throw new Error('Each model needs its own token-counted context bundles.');const c=bundles[0]!;
    if(c.B.tokens>c.tokenBudget||c.C.tokens>c.tokenBudget||Math.abs(c.B.tokens-c.C.tokens)>Math.max(1,Math.floor(c.tokenBudget*0.01)))throw new Error('B and C must fit the same token budget and differ by at most 1%.');
  }
  const reserved=p.tasks.flatMap(t=>[...t.hiddenTests,t.hardenedSource,t.controlProof]);
  const reservedPaths=new Set(reserved.map(f=>f.path)),reservedHashes=new Set(reserved.map(f=>f.sha256));
  const visible=[p.promptTemplate,...p.tasks.flatMap(t=>[t.prompt,...t.accessibleFiles]),...p.contexts.flatMap(c=>[...c.B.files,...c.C.files])];
  if(visible.some(f=>reservedPaths.has(f.path)||reservedHashes.has(f.sha256)))throw new Error('Hidden tests, the hardened solution and control proof cannot be model-accessible, including renamed copies or another task.');
  return p;
}
export function protocolFiles(p:Protocol){return [...p.tasks.flatMap(t=>[t.prompt,...t.accessibleFiles,...t.hiddenTests,t.controlProof,t.baselineSource,t.hardenedSource]),...p.contexts.flatMap(c=>[c.tokenizationReceipt,...c.B.files,...c.C.files]),p.promptTemplate,...p.evaluatorFiles,p.runnerManifest];}
const forbidden=/(?:^|\/)(?:\.env(?:\..*)?|\.git|\.vercel|\.private|plans|node_modules)(?:\/|$)|\.(?:pem|key)$/i;
/** This reads only an explicit, hashed corpus. No repository-wide or credential discovery. */
export async function verifyProtocolFiles(root:string,p:Protocol){
  const base=await realpath(root),seen=new Map<string,string>();
  for(const f of protocolFiles(p)){
    if(isAbsolute(f.path)||f.path.includes('\\')||f.path.split('/').includes('..')||forbidden.test(f.path))throw new Error(`Unsafe corpus path: ${f.path}`);
    const actual=await realpath(resolve(base,f.path)),rel=relative(base,actual);
    if(rel==='..'||rel.startsWith(`..${sep}`)||isAbsolute(rel))throw new Error(`Corpus symlink escapes root: ${f.path}`);
    const prior=seen.get(f.path);if(prior&&prior!==f.sha256)throw new Error(`Conflicting frozen hash: ${f.path}`);
    if(digest(await readFile(actual))!==f.sha256)throw new Error(`Frozen file changed: ${f.path}`);seen.set(f.path,f.sha256);
  }
  return {protocolHash:digest(canonical(p)),files:seen.size,plannedAttempts:600,heldOutAttempts:300};
}
