import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const forbidden=new Set(['process','globalThis','global','require','eval','Function','Reflect','module','exports','__dirname','__filename','WebSocket','XMLHttpRequest','fetch','setInterval','setTimeout','PaypalClient']);
const members=new Set(['constructor','prototype','__proto__','getPrototypeOf','getOwnPropertyDescriptor','getOwnPropertyDescriptors','getOwnPropertySymbols','defineProperty','defineProperties','setPrototypeOf','fetch','transport','customHttpClient','oauth2']);
export function sourcePolicy(source,language){
  if(language==='Python'){
    const result=spawnSync('/runtime/venv/bin/python',['/runtime/policy.py'],{input:source,encoding:'utf8',timeout:5000,maxBuffer:100000,env:{PATH:'/runtime/venv/bin:/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1'}});
    try{return JSON.parse(result.stdout);}catch{return {passed:false,findings:[{line:1,code:'POLICY_UNAVAILABLE'}]};}
  }
  const file=ts.createSourceFile('candidate.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),findings=[];
  const reject=(node,code)=>findings.push({line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,code});
  if(/@ts-(?:ignore|nocheck|expect-error)/.test(source))findings.push({line:1,code:'TYPE_SUPPRESSION'});
  function visit(node){
    if(ts.isImportDeclaration(node)&&(!ts.isStringLiteral(node.moduleSpecifier)||!['paypal','./api.js','./api','node:crypto'].includes(node.moduleSpecifier.text)))reject(node,'IMPORT_BOUNDARY');
    if(ts.isExportDeclaration(node)&&node.moduleSpecifier||ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)reject(node,'DYNAMIC_MODULE');
    if(ts.isIdentifier(node)&&forbidden.has(node.text))reject(node,'AMBIENT_CAPABILITY');
    if((ts.isIdentifier(node)||ts.isStringLiteral(node))&&members.has(node.text))reject(node,'REFLECTION_OR_TRANSPORT');
    if(ts.isPropertyAccessExpression(node)&&node.name.text.startsWith('_')||ts.isElementAccessExpression(node)&&ts.isStringLiteral(node.argumentExpression)&&node.argumentExpression.text.startsWith('_'))reject(node,'PRIVATE_CAPABILITY');
    if(ts.isElementAccessExpression(node)&&node.argumentExpression&&!ts.isNumericLiteral(node.argumentExpression)&&!ts.isStringLiteral(node.argumentExpression))reject(node,'COMPUTED_CAPABILITY');
    if(ts.isCatchClause(node)){let throws=false;const scan=n=>{if(ts.isThrowStatement(n))throws=true;ts.forEachChild(n,scan);};scan(node.block);if(!throws)reject(node,'UNCLASSIFIED_BROAD_CATCH');}
    ts.forEachChild(node,visit);
  }
  visit(file);return {passed:findings.length===0,findings};
}
