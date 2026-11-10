import ts from "typescript";
import type { PolicyCheckDTO } from "@fracture/contracts";
const imports=new Set(["node:crypto","@fracture/paypal-core","./contract","./contract.js"]);
const forbidden=new Set(["process","globalThis","global","require","eval","Function","Reflect","module","exports","__dirname","__filename","WebSocket","XMLHttpRequest","WebTransport"]);
const unsafeMember=new Set(["constructor","prototype","__proto__","getPrototypeOf","getOwnPropertyDescriptor","getOwnPropertyDescriptors","getOwnPropertySymbols","defineProperty","defineProperties","setPrototypeOf"]);
export function inspectCandidate(source:string):PolicyCheckDTO[]{
  const file=ts.createSourceFile("faulty.ts",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);const diagnostics=ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).diagnostics??[];const violations:{kind:string;line:number;description:string}[]=[];const reject=(node:ts.Node,kind:string,description:string)=>violations.push({kind,line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,description});
  const visit=(node:ts.Node)=>{
    if(ts.isImportDeclaration(node)&&(!ts.isStringLiteral(node.moduleSpecifier)||!imports.has(node.moduleSpecifier.text)))reject(node,"imports","Import is outside the frozen fixture contract.");
    if(ts.isExportDeclaration(node))reject(node,"imports","Re-exporting another implementation is not a repair.");
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)reject(node,"imports","Dynamic imports are not permitted.");
    if(ts.isIdentifier(node)&&forbidden.has(node.text))reject(node,"ambient","Ambient process, reflection or execution access is not permitted.");
    if((ts.isIdentifier(node)||ts.isStringLiteral(node))&&unsafeMember.has(node.text))reject(node,"reflection","Prototype and constructor access, including destructuring aliases, is not permitted.");
    if(ts.isElementAccessExpression(node)&&node.argumentExpression&&!ts.isNumericLiteral(node.argumentExpression))reject(node,"reflection","Computed object access is outside this bounded checkout contract.");
    if(ts.isStringLiteral(node)&&/^https?:\/\//.test(node.text)&&!/^https:\/\/api-m\.sandbox\.paypal\.com(?:\/|$)/.test(node.text))reject(node,"network","Only the declared local provider endpoint may appear.");
    if(ts.isStringLiteral(node)&&/\b(?:DROP|ALTER|ATTACH|DETACH|PRAGMA)\b/i.test(node.text))reject(node,"store","The candidate cannot alter its storage schema or attach databases.");
    ts.forEachChild(node,visit);
  };visit(file);
  const checks:[string,string,string][]=[["imports","Imports stay inside the pinned contract","Only the public payment core, node:crypto and the fixture interface may be imported."],["ambient","No process, credentials or dynamic execution","Ambient process and shell access are rejected by the static policy."],["reflection","No prototype or computed-member access","Known reflection paths are rejected; the container remains the execution boundary."],["network","No arbitrary egress destination","Network is additionally disabled by the container runtime."],["store","No schema or test mutation","SQL capabilities are independently checked at runtime."]];
  return [{id:"single-file",name:"One bounded TypeScript checkout",passed:source.length>50&&source.length<100000&&!diagnostics.some(item=>item.category===ts.DiagnosticCategory.Error),reason:"Only the checkout source is accepted; tests, dependencies and runtime files are immutable."},...checks.map(([id,name,reason])=>({id,name,passed:!violations.some(item=>item.kind===id),reason:violations.filter(item=>item.kind===id).map(item=>`Line ${item.line}: ${item.description}`).join(" ")||reason}))];
}
