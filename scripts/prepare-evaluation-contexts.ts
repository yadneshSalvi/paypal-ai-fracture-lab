import {mkdir,readFile,writeFile,readdir,cp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join,relative} from 'node:path';
import ts from 'typescript';
import {digest} from '../packages/evaluation/src/protocol';

const root=resolve(import.meta.dirname,'..'),destination=join(root,'evaluation/contexts');
await mkdir(destination,{recursive:true});
const pins={skills:'7cbdf85dc95f09d9ede8c5d349506686684fa0d4',typescript:'5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2',python:'143e57f2a3729d7df3727386b8c9ddf023d9a5df',rest:'90e8041ffe02d80c452d2b476bedd59a8d219bdc'};
const records:Array<Record<string,unknown>>=[];
async function save(path:string,text:string,source:string,license:string,transform='verbatim'){
  const out=join(root,path);await mkdir(resolve(out,'..'),{recursive:true});await writeFile(out,text);
  records.push({path,sha256:digest(text),bytes:Buffer.byteLength(text),source,license,transform});return text;
}
async function get(url:string){const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`Source fetch failed: ${response.status} ${url}`);return response.text();}
const mit=await readFile(join(root,'.agents/apimatic-paypal/LICENSE.txt'),'utf8');
await save('evaluation/contexts/licenses/APIMatic-MIT.txt',mit,`https://github.com/context-plugins/plugin-marketplace/blob/${pins.skills}/LICENSE`,'MIT');
const apacheUrl=`https://raw.githubusercontent.com/paypal/paypal-rest-api-specifications/${pins.rest}/LICENSE`;
await save('evaluation/contexts/licenses/PayPal-Apache-2.0.txt',await get(apacheUrl),apacheUrl,'Apache-2.0');
const companions=['integrate-paypal','getting-started','client-initialization','authentication','configuration-resilience','calling-endpoints','error-handling','models','testing'];
for(const language of ['typescript','python'] as const){
  const parts:string[]=[`# Frozen APIMatic SDK guidance\n\nLanguage: ${language}. SDK source commit: ${pins[language]}. Skills source commit: ${pins.skills}. These source excerpts retain their upstream spelling. The candidate workspace contract controls what can be changed or executed.\n\n${mit}`];
  for(const name of companions){const path=`.agents/skills/${language}-${name}/SKILL.md`;parts.push(`\n\n<!-- Source: ${path}; MIT; original SHA-256 ${digest(await readFile(join(root,path)))} -->\n\n${await readFile(join(root,path),'utf8')}`);}
  const reference=`.agents/skills/${language}-models/reference.md`;parts.push(`\n\n<!-- Source: ${reference}; MIT -->\n\n${await readFile(join(root,reference),'utf8')}`);
  const sdkBase=`https://raw.githubusercontent.com/context-plugins/paypal-${language}-sdk/${pins[language]}`;
  const sdkMap=language==='typescript'?await readFile(join(root,'node_modules/paypal/sdk-map.md'),'utf8'):await get(`${sdkBase}/sdk-map.md`);
  await save(`evaluation/contexts/sources/${language}/sdk-map.md`,sdkMap,`${sdkBase}/sdk-map.md`,'MIT');
  parts.push(`\n\n<!-- Source: SDK sdk-map.md; MIT -->\n\n${sdkMap}`);
  const names=language==='typescript'?['createOrder','getOrder','captureOrder','getCapturedPayment','refundCapturedPayment','getRefund']:['create_order','get_order','capture_order','get_captured_payment','refund_captured_payment','get_refund'];
  for(const resource of ['orders','payments']){
    const map=language==='typescript'?await readFile(join(root,`node_modules/paypal/map/operations/${resource}.md`),'utf8'):await get(`${sdkBase}/map/operations/${resource}.md`);
    await save(`evaluation/contexts/sources/${language}/${resource}.md`,map,`${sdkBase}/map/operations/${resource}.md`,'MIT');
    const blocks=map.split(/(?=^### )/m).filter(block=>names.some(name=>block.startsWith(`### ${name}\n`)||block.startsWith(`### \`${name}\``)||block.startsWith(`### client.${resource}.${name}\n`)));
    if(blocks.length!==3)throw new Error(`Selected SDK map operations missing: ${language} ${resource}`);
    parts.push(`\n\n<!-- Source: SDK map/operations/${resource}.md; selected complete operation blocks; MIT -->\n\n${blocks.join('\n')}`);
  }
  await save(`evaluation/contexts/${language}-B.md`,parts.join('\n'),`APIMatic ${language} skills and pinned SDK maps`,'MIT','Verbatim named skill/reference/map sections concatenated in declared order; no generated advice.');
}
// All six operation blocks precede the recursively referenced schemas. Prefix
// truncation is performed later using each provider's own token-count service.
const restParts:string[]=['# Official PayPal REST specification excerpts\n\nSource: paypal/paypal-rest-api-specifications; commit '+pins.rest+'. Licensed Apache-2.0. Full license accompanies the study. The operation blocks below are verbatim JSON values from the official OpenAPI sources. Referenced schemas follow in breadth-first reference order. The frozen token budget may end the final schema excerpt.\n'];
const operationSets=[{file:'checkout_orders_v2.json',routes:[['/v2/checkout/orders','post'],['/v2/checkout/orders/{id}','get'],['/v2/checkout/orders/{id}/capture','post']]},{file:'payments_payment_v2.json',routes:[['/v2/payments/captures/{capture_id}','get'],['/v2/payments/captures/{capture_id}/refund','post'],['/v2/payments/refunds/{refund_id}','get']]}];
const queues:Array<{file:string;spec:Record<string,any>;refs:string[];seen:Set<string>}>=[];
const refs=(v:unknown)=>[...JSON.stringify(v).matchAll(/"\$ref":"([^"\\]+)"/g)].map(m=>m[1]!);
for(const set of operationSets){
  const url=`https://raw.githubusercontent.com/paypal/paypal-rest-api-specifications/${pins.rest}/openapi/${set.file}`,raw=await get(url),spec=JSON.parse(raw) as Record<string,any>;
  await save(`evaluation/contexts/sources/rest/${set.file}`,raw,url,'Apache-2.0');
  const queue={file:set.file,spec,refs:[] as string[],seen:new Set<string>()};queues.push(queue);
  for(const [path,method] of set.routes){const value=spec.paths[path!]?.[method!];if(!value)throw new Error(`Missing official operation ${path}`);restParts.push(`\n## ${method!.toUpperCase()} ${path}\nSource: ${set.file}\n\n${JSON.stringify(value,null,2)}\n`);queue.refs.push(...refs(value));if(spec.paths[path!].parameters){restParts.push(JSON.stringify({parameters:spec.paths[path!].parameters},null,2));queue.refs.push(...refs(spec.paths[path!].parameters));}}
  for(const [key,value] of Object.entries(spec.components?.securitySchemes??{}))restParts.push(`\n## ${set.file} securitySchemes/${key}\n${JSON.stringify(value,null,2)}\n`);
}
const completeOperationsCharacters=restParts.join('\n').length;
while(queues.some(q=>q.refs.length))for(const queue of queues){
  const ref=queue.refs.shift();if(!ref||queue.seen.has(ref))continue;queue.seen.add(ref);
  if(!ref.startsWith('#/'))throw new Error(`Unresolved external reference: ${ref}`);
  let value:unknown=queue.spec;for(const part of ref.slice(2).split('/'))value=(value as Record<string,unknown>)[part.replaceAll('~1','/').replaceAll('~0','~')];
  if(value===undefined)throw new Error(`Missing schema ${queue.file} ${ref}`);
  restParts.push(`\n## ${queue.file} ${ref}\n${JSON.stringify(value,null,2)}\n`);queue.refs.push(...refs(value));
}
await save('evaluation/contexts/rest-full.md',restParts.join('\n'),'Official REST sources at '+pins.rest,'Apache-2.0','Six complete operation blocks, path parameters/security, then breadth-first transitive schema references; no SDK method guidance.');
const typeRecords:unknown[]=[];
async function files(path:string):Promise<string[]>{const out:string[]=[];for(const entry of await readdir(path,{withFileTypes:true})){if(entry.isDirectory())out.push(...await files(join(path,entry.name)));else out.push(join(path,entry.name));}return out.sort();}
const tsRoot=join(root,'node_modules/paypal/dist/esm'),printer=ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed});
for(const path of (await files(tsRoot)).filter(p=>p.endsWith('.d.ts'))){
  const raw=await readFile(path,'utf8'),source=ts.createSourceFile(path,raw,ts.ScriptTarget.Latest,true),projected=printer.printFile(source),target=`evaluation/types/typescript/paypal/${relative(tsRoot,path)}`;
  await mkdir(resolve(join(root,target),'..'),{recursive:true});await writeFile(join(root,target),projected);typeRecords.push({path:target,sha256:digest(projected),source:`${relative(join(root,'node_modules/paypal'),path)}`,sourceSha256:digest(raw),transformation:'TypeScript declaration printer removeComments=true'});
}
const pythonRoot=join(root,'.artifacts/tandem-venv/lib/python3.11/site-packages/paypal');
const direct=JSON.parse(await readFile(join(root,'.artifacts/tandem-venv/lib/python3.11/site-packages/paypal-2.29.dist-info/direct_url.json'),'utf8'));
if(direct.vcs_info.commit_id!==pins.python)throw new Error('Installed Python SDK commit changed.');
const pythonTypes=JSON.parse(execFileSync('python3',[join(root,'scripts/project-python-types.py'),pythonRoot,join(root,'evaluation/types/python/paypal')],{encoding:'utf8',maxBuffer:4000000}));
for(const item of pythonTypes)typeRecords.push({path:`evaluation/types/python/paypal/${item.file}`,sha256:item.sha256,source:`paypal/${item.source}`,sourceSha256:item.sourceSha256,transformation:'AST signature projection; function bodies, comments, docstrings and Field prose removed; source never executed'});
await mkdir(join(root,'evaluation/types'),{recursive:true});
await writeFile(join(root,'evaluation/types/provenance.json'),JSON.stringify({schemaVersion:1,pins:{typescript:pins.typescript,python:pins.python},license:'MIT',records:typeRecords},null,2)+'\n');
await cp(join(root,'evaluation/contexts/licenses/APIMatic-MIT.txt'),join(root,'evaluation/types/LICENSE.txt'));
await writeFile(join(destination,'provenance.json'),JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString(),pins,completeOperationsCharacters,records,limitations:['Types convey API information in every arm; A means no added natural-language bundle.','These contexts and offline fixtures do not establish new live provider facts.','C is a raw official REST specification with a predeclared prefix truncation order, not SDK usage guidance.']},null,2)+'\n');
console.log(JSON.stringify({stage:'sources_prepared',records:records.length,types:typeRecords.length,completeOperationsCharacters}));
