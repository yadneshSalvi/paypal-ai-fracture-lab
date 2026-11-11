import ts from "typescript";
import { sha256 } from "@fracture/paypal-core";
import type { MapFinding, SourceRef } from "@fracture/contracts";

export type PaymentAdapter="raw_http"|"apimatic_context"|"paypal_server_sdk"|"legacy_paypal";
export interface PaymentCallSite {id:string;adapter:PaymentAdapter;operation:string;method:string|null;endpoint:string|null;source:SourceRef;identity:"present"|"absent"|"unknown";genericIdentity:boolean}
export interface TypeScriptAnalysis {path:string;sourceHash:string;calls:PaymentCallSite[];findings:MapFinding[];limitations:string[]}
type Fields={values:Map<string,ts.Expression>;unknown:boolean};

/** Source is parsed as data. No import, evaluation or filesystem access occurs. */
export function analyzeTypeScriptPayments(path:string,text:string):TypeScriptAnalysis {
 const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);const hash=sha256(text);
 const calls:PaymentCallSite[]=[];const findings:MapFinding[]=[];const imported=new Map<string,PaymentAdapter>();const variables=new Map<string,ts.Expression[]>();const unstable=new Set<string>();
 const ref=(node:ts.Node,label:string):SourceRef=>({path,line:file.getLineAndCharacterOfPosition(node.getStart(file)).line+1,label,hash});
 const walk=(node:ts.Node,visit:(node:ts.Node)=>void)=>{visit(node);ts.forEachChild(node,child=>walk(child,visit));};
 for(const statement of file.statements){
  if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier))continue;
  const adapter:PaymentAdapter|undefined=statement.moduleSpecifier.text==="paypal"?"apimatic_context":statement.moduleSpecifier.text==="@paypal/paypal-server-sdk"?"paypal_server_sdk":statement.moduleSpecifier.text==="paypal-rest-sdk"?"legacy_paypal":undefined;
  if(!adapter)continue;const clause=statement.importClause;if(clause?.isTypeOnly)continue;
  if(clause?.name)imported.set(clause.name.text,adapter);
  if(clause?.namedBindings&&ts.isNamespaceImport(clause.namedBindings))imported.set(clause.namedBindings.name.text,adapter);
  if(clause?.namedBindings&&ts.isNamedImports(clause.namedBindings))for(const binding of clause.namedBindings.elements)if(!binding.isTypeOnly)imported.set(binding.name.text,adapter);
 }
 walk(file,node=>{if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer){const values=variables.get(node.name.text)??[];values.push(node.initializer);variables.set(node.name.text,values);}});
 walk(file,node=>{if(ts.isParameter(node)&&ts.isIdentifier(node.name))unstable.add(node.name.text);if(ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment&&ts.isIdentifier(node.left))unstable.add(node.left.text);});
 // A shadowed or multiply assigned binding cannot borrow evidence from another scope.
 function resolve(value:ts.Expression|undefined,seen=new Set<string>()):ts.Expression|undefined{
  if(!value)return undefined;if(ts.isParenthesizedExpression(value)||ts.isAsExpression(value)||ts.isSatisfiesExpression(value))return resolve(value.expression,seen);
  if(!ts.isIdentifier(value))return value;if(seen.has(value.text)||unstable.has(value.text))return undefined;const values=variables.get(value.text);return values?.length===1?resolve(values[0],new Set([...seen,value.text])):undefined;
 }
 function literal(value:ts.Expression|undefined):string|undefined{const found=resolve(value);if(!found)return undefined;if(ts.isStringLiteralLike(found))return found.text;if(ts.isTemplateExpression(found))return found.head.text+found.templateSpans.map(span=>`{…}${span.literal.text}`).join("");return undefined;}
 function fields(value:ts.Expression|undefined):Fields{
  const found=resolve(value);const result:Fields={values:new Map(),unknown:!found||!ts.isObjectLiteralExpression(found)};if(!found||!ts.isObjectLiteralExpression(found))return result;
  for(const property of found.properties){if(ts.isPropertyAssignment(property)&&!ts.isComputedPropertyName(property.name))result.values.set(property.name.getText(file).replace(/^['"]|['"]$/g,"").toLowerCase(),property.initializer);else if(ts.isShorthandPropertyAssignment(property))result.values.set(property.name.text.toLowerCase(),property.name);else result.unknown=true;}return result;
 }
 function rootName(expression:ts.Expression):string|undefined{return ts.isIdentifier(expression)?expression.text:ts.isPropertyAccessExpression(expression)?rootName(expression.expression):undefined;}
 function adapterFor(expression:ts.Expression,seen=new Set<string>()):PaymentAdapter|undefined{
  const root=rootName(expression);if(!root||seen.has(root)||unstable.has(root))return undefined;if(imported.has(root))return imported.get(root);const values=variables.get(root);if(values?.length!==1)return undefined;
  const initializer=values[0]!;return adapterFor(ts.isNewExpression(initializer)||ts.isCallExpression(initializer)?initializer.expression:initializer,new Set([...seen,root]));
 }
 function finding(call:PaymentCallSite,id:string,title:string,description:string,severity:MapFinding["severity"]="risk",factId?:string){findings.push({id:`${id}:${call.source.line}:${calls.length}`,title,description,severity,source:call.source,...(factId?{factId}:{})});}
 walk(file,node=>{
  if(!ts.isCallExpression(node))return;const expression=node.expression;const methodName=ts.isPropertyAccessExpression(expression)?expression.name.text:ts.isIdentifier(expression)?expression.text:"";
  let adapter:PaymentAdapter|undefined;let operation="";let method:string|null=null;let endpoint:string|null=null;let options:Fields={values:new Map(),unknown:true};
  if(methodName==="fetch"){
   const first=resolve(node.arguments[0]);const request=first&&ts.isNewExpression(first)&&ts.isIdentifier(first.expression)&&first.expression.text==="Request"?first:null;
   const url=literal(request?request.arguments?.[0]:node.arguments[0]);if(!url||!/^https:\/\/(?:api-m|api)\.(?:sandbox\.)?paypal\.com\//.test(url))return;
   endpoint=url.replace(/^https:\/\/[^/]+/,"").split(/[?#]/)[0]!;options=fields(request?request.arguments?.[1]:node.arguments[1]);method=literal(options.values.get("method"))?.toUpperCase()??(options.unknown?null:"GET");adapter="raw_http";operation=`${method??"unknown method"} ${endpoint}`;const headers=options.values.has("headers")?fields(options.values.get("headers")):{values:new Map<string,ts.Expression>(),unknown:false};options={values:headers.values,unknown:options.unknown||headers.unknown};
  }else{
   adapter=adapterFor(expression);if(!adapter||!/^(?:createOrder|captureOrder|authorizeOrder|refundCapturedPayment|captureAuthorizedPayment|voidPayment|create|execute|capture|refund|sale|authorize|void)$/.test(methodName))return;
   operation=expression.getText(file);method="POST";options=fields(node.arguments[0]);
  }
  const supplied=options.values.get(adapter==="raw_http"?"paypal-request-id":"paypalrequestid");const empty=supplied&&(supplied.kind===ts.SyntaxKind.NullKeyword||(ts.isIdentifier(supplied)&&supplied.text==="undefined")||literal(supplied)==="");
  const call:PaymentCallSite={id:`call:${node.getStart(file)}`,adapter,operation,method,endpoint,source:ref(node,operation),identity:options.unknown||adapter==="legacy_paypal"?"unknown":supplied&&!empty?"present":"absent",genericIdentity:options.values.has("idempotency-key")};calls.push(call);
  if(!["POST","PATCH","DELETE"].includes(method??""))return;
  const action=endpoint==="/v2/checkout/orders"?"Create order":endpoint?.endsWith("/capture")?"Capture payment":endpoint?.endsWith("/refund")?"Refund payment":methodName;
  const adapterLabel={raw_http:"raw HTTP",apimatic_context:"APIMatic context SDK",paypal_server_sdk:"PayPal server SDK",legacy_paypal:"legacy PayPal"}[adapter];
  if(call.identity==="absent")finding(call,"request-identity",`${action} has no request ID`,`This ${adapterLabel} call has no statically supplied PayPal-Request-Id. A hidden wrapper, provider rule or runtime behavior needs separate evidence.`);
  if(call.identity==="unknown")finding(call,"unresolved-identity","Request identity needs runtime inspection","Dynamic options or spreads prevent complete static analysis. No missing-header defect is inferred.","unverified");
  if(call.genericIdentity&&call.identity!=="present")finding(call,"generic-identity","Generic header is not endpoint identity","The source supplies Idempotency-Key without a resolved PayPal-Request-Id. Provider enforcement is unverified; this does not assert that PayPal ignored the generic header.","unverified","F9");
 });
 walk(file,node=>{
  if(!ts.isCatchClause(node))return;let failed:ts.Node|undefined;let reread=false;
  walk(node.block,child=>{if(ts.isBinaryExpression(child)&&child.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isPropertyAccessExpression(child.left)&&child.left.name.text==="status"&&literal(child.right)==="failed")failed=child;
   if(ts.isCallExpression(child)&&ts.isPropertyAccessExpression(child.expression)&&/^(getOrder|getCapturedPayment|reconcile|read)$/.test(child.expression.name.text))reread=true;});
  if(failed&&!reread)findings.push({id:`unknown-as-failed:${node.pos}`,title:"Catch branch labels the payment failed",severity:"risk",description:"This catch writes failed without a recognized resource reread in that branch. Runtime evidence must establish whether money moved; an unseen helper may change the interpretation.",source:ref(failed,"Failed status in catch")});
 });
 return {path,sourceHash:hash,calls,findings,limitations:["AST findings describe the supplied revision, not provider behavior or complete control flow.","Imports, simple aliases, literal Request options and uniquely named local initializers are recognized. Dynamic dispatch, spreads and ambiguous shadowed bindings remain unknown.","A request-ID field alone does not establish durable business identity, money limits or current consent.","SDK receiver detection identifies syntax; it does not certify an installed dependency version or supported endpoint."]};
}
