import ts from "typescript";
import { SourceWorkspaceError } from "./types";
import type { DeclaredSourceTool, SourceImportLimits, SourceIntegrationNode } from "./types";
import { GraphBuilder, wholeFileSource } from "./graph";
import type { InspectedSource, InspectionFragment } from "./graph";
import { digest, discoveredOrigins, objectHash, safeLabel, sourceSpan } from "./util";

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration | ts.ConstructorDeclaration;
type Binding = { node: ts.Node; initializer?: ts.Expression; module?: string; invalid: boolean };
type Scope = { parent?: Scope; bindings: Map<string, Binding> };
type Fields = { values: Map<string, ts.Expression>; unknown: boolean };
const isFunction = (node: ts.Node): node is FunctionNode => ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isConstructorDeclaration(node);
const paymentMethods = /^(?:createOrder|captureOrder|authorizeOrder|refundCapturedPayment|captureAuthorizedPayment|voidPayment|getOrder|getCapturedPayment|getAuthorizedPayment|create|execute|capture|refund|sale|authorize|void)$/;
const readMethods = /^(?:getOrder|getCapturedPayment|getAuthorizedPayment|getAuthorization|reconcile|reconcilePayment|readCapture|readOrder|fetchCapture|fetchOrder)$/i;
const fulfillMethods = /^(?:fulfill|fulfillOrder|fulfillPurchase|deliver|deliverBook|issueTicket|issueTickets|createEntitlement|grantEntitlement|sendDownload)$/i;

/** Compiler API parses text only. No source module is imported, checked against disk, or evaluated. */
export function inspectTypeScript(source: InspectedSource, limits: SourceImportLimits): InspectionFragment {
  const { manifest, content } = source;
  const kind = /\.tsx$/.test(manifest.path) ? ts.ScriptKind.TSX : /\.jsx$/.test(manifest.path) ? ts.ScriptKind.JSX : manifest.language === "javascript" ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const file = ts.createSourceFile(manifest.path, content, ts.ScriptTarget.Latest, true, kind);
  if ((file as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
  const all: ts.Node[] = [];
  const queue: { node: ts.Node; depth: number }[] = [{ node: file, depth: 0 }];
  while (queue.length) {
    const { node, depth } = queue.pop()!;
    if (all.length >= limits.maxParserNodes || depth > limits.maxSyntaxDepth) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
    all.push(node);
    ts.forEachChild(node, child => { queue.push({ node: child, depth: depth + 1 }); });
  }
  const graph = new GraphBuilder(limits);
  const ref = (node: ts.Node) => sourceSpan(manifest.path, manifest.hash, content, node.getStart(file), node.getEnd());
  const fileNode = graph.addNode("file", manifest.path, wholeFileSource(source), "typescript_ast");
  const scopes = new WeakMap<ts.Node, Scope>();
  const root: Scope = { bindings: new Map() };
  const addBinding = (scope: Scope, name: string, input: Binding) => {
    const prior = scope.bindings.get(name);
    if (prior) { prior.invalid = true; input.invalid = true; }
    else scope.bindings.set(name, input);
  };
  const bindName = (scope: Scope, name: ts.BindingName, node: ts.Node, initializer?: ts.Expression) => {
    if (ts.isIdentifier(name)) addBinding(scope, name.text, { node, invalid: false, ...(initializer ? { initializer } : {}) });
    else for (const element of name.elements) if (ts.isBindingElement(element)) bindName(scope, element.name, node);
  };
  function scopeTree(node: ts.Node, inherited: Scope): void {
    if (ts.isFunctionDeclaration(node) && node.name) addBinding(inherited, node.name.text, { node, invalid: false });
    let scope = inherited;
    if (node !== file && (isFunction(node) || ts.isBlock(node) || ts.isCatchClause(node))) scope = { parent: inherited, bindings: new Map() };
    scopes.set(node, scope);
    if (ts.isVariableDeclaration(node)) bindName(scope, node.name, node, node.initializer);
    if (ts.isParameter(node)) bindName(scope, node.name, node);
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && !node.importClause?.isTypeOnly) {
      const module = node.moduleSpecifier.text, clause = node.importClause;
      if (clause?.name) addBinding(scope, clause.name.text, { node, module, invalid: false });
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) addBinding(scope, bindings.name.text, { node, module, invalid: false });
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) if (!binding.isTypeOnly) addBinding(scope, binding.name.text, { node, module, invalid: false });
    }
    ts.forEachChild(node, child => scopeTree(child, scope));
  }
  scopeTree(file, root);
  function lookup(node: ts.Node, name: string): Binding | undefined {
    for (let scope: Scope | undefined = scopes.get(node); scope; scope = scope.parent) { const binding = scope.bindings.get(name); if (binding) return binding; }
    return undefined;
  }
  const rootIdentifier = (node: ts.Expression): ts.Identifier | undefined => ts.isIdentifier(node) ? node : ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? rootIdentifier(node.expression) : undefined;
  for (const node of all) {
    let target: ts.Expression | undefined;
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) target = node.left;
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) target = node.operand;
    if (target) { const name = rootIdentifier(target); const binding = name && lookup(node, name.text); if (binding) binding.invalid = true; }
  }
  function resolve(node: ts.Expression | undefined, seen = new Set<Binding>()): ts.Expression | undefined {
    if (!node) return undefined;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) return resolve(node.expression, seen);
    if (!ts.isIdentifier(node)) return node;
    const binding = lookup(node, node.text);
    if (!binding || binding.invalid || !binding.initializer || seen.has(binding)) return undefined;
    return resolve(binding.initializer, new Set([...seen, binding]));
  }
  function literal(node: ts.Expression | undefined): string | undefined {
    const found = resolve(node);
    if (!found) return undefined;
    if (ts.isStringLiteralLike(found)) return found.text;
    if (ts.isTemplateExpression(found)) return found.head.text + found.templateSpans.map(span => `{dynamic}${span.literal.text}`).join("");
    if (ts.isBinaryExpression(found) && found.operatorToken.kind === ts.SyntaxKind.PlusToken) { const a = literal(found.left), b = literal(found.right); return a !== undefined && b !== undefined ? a + b : undefined; }
    return undefined;
  }
  function fields(node: ts.Expression | undefined): Fields {
    const found = resolve(node), result: Fields = { values: new Map(), unknown: !found || !ts.isObjectLiteralExpression(found) };
    if (found && ts.isObjectLiteralExpression(found)) for (const item of found.properties) {
      if (ts.isPropertyAssignment(item) && !ts.isComputedPropertyName(item.name)) result.values.set(item.name.getText(file).replace(/^['"]|['"]$/g, "").toLowerCase(), item.initializer);
      else if (ts.isShorthandPropertyAssignment(item)) result.values.set(item.name.text.toLowerCase(), item.name);
      else result.unknown = true;
    }
    return result;
  }
  function adapter(node: ts.Expression, seen = new Set<Binding>()): SourceIntegrationNode["adapter"] | undefined {
    const name = rootIdentifier(node);
    if (!name) return undefined;
    const binding = lookup(name, name.text);
    if (!binding || binding.invalid || seen.has(binding)) return undefined;
    if (binding.module) return binding.module === "paypal" ? "apimatic_context" : binding.module === "@paypal/paypal-server-sdk" ? "paypal_server_sdk" : ["paypal-rest-sdk", "@paypal/checkout-server-sdk"].includes(binding.module) ? "legacy_paypal" : undefined;
    if (!binding.initializer) return undefined;
    const initial = binding.initializer;
    return adapter(ts.isNewExpression(initial) || ts.isCallExpression(initial) ? initial.expression : initial, new Set([...seen, binding]));
  }
  const functionNodes = new Map<ts.Node, SourceIntegrationNode>();
  const functionName = (node: FunctionNode): string => {
    if ("name" in node && node.name) return safeLabel(node.name.getText(file), "Anonymous function");
    return ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name) ? node.parent.name.text : "Anonymous function";
  };
  for (const node of all) if (isFunction(node)) {
    const fn = graph.addNode("function", functionName(node), ref(node), "typescript_ast");
    functionNodes.set(node, fn);
    graph.addEdge(fileNode.id, fn.id, "contains", fn.evidence);
  }
  function owner(node: ts.Node): SourceIntegrationNode {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) { const fn = functionNodes.get(current); if (fn) return fn; }
    return fileNode;
  }
  function functionOwnerAst(node: ts.Node): ts.Node {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) if (isFunction(current)) return current;
    return file;
  }
  const origins = new Map<ts.Node, SourceIntegrationNode[]>();
  for (const node of all) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const module = graph.addNode("module", safeLabel(node.moduleSpecifier.text, "Unresolved module"), ref(node.moduleSpecifier), "typescript_ast");
      graph.addEdge(fileNode.id, module.id, "imports", module.evidence);
      if (node.moduleSpecifier.text.startsWith(".")) graph.imports.push({ from: module.id, module: node.moduleSpecifier.text, source: ref(node.moduleSpecifier) });
    }
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      const value = ts.isTemplateExpression(node) ? literal(node) ?? "" : node.text;
      for (const origin of discoveredOrigins(value)) {
        const destination = graph.addNode("outbound_destination", origin, ref(node), "typescript_ast", "syntax", { origin });
        graph.addEdge(owner(node).id, destination.id, "targets", destination.evidence, "inferred");
        origins.set(node, [...(origins.get(node) ?? []), destination]);
      }
    }
    if ((ts.isPropertyAccessExpression(node) || ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.name && ts.isIdentifier(node.name) && /^(?:businessIntentId|intentId|purchaseId|checkoutId)$/.test(node.name.text)) {
      const intent = graph.addNode("commerce_intent", node.name.text, ref(node), "typescript_ast", "inferred");
      graph.addEdge(owner(node).id, intent.id, "contains", intent.evidence, "inferred");
    }
  }
  const providerCalls = new Map<ts.CallExpression, SourceIntegrationNode>();
  const reconciliations: { call: ts.CallExpression; node: SourceIntegrationNode }[] = [];
  const fulfillments: { call: ts.CallExpression; node: SourceIntegrationNode }[] = [];
  const verifies: ts.CallExpression[] = [];
  const webhookContexts = new Set<ts.Node>();
  for (const node of all.filter(ts.isCallExpression).sort((a, b) => a.pos - b.pos)) {
    const expression = node.expression;
    const methodName = ts.isPropertyAccessExpression(expression) ? expression.name.text : ts.isIdentifier(expression) ? expression.text : "";
    const receiver = ts.isPropertyAccessExpression(expression) ? expression.expression.getText(file) : methodName;
    const context = owner(node);
    let paymentAdapter = adapter(expression), method: string | undefined, endpoint: string | undefined;
    let options: Fields = { values: new Map(), unknown: true };
    let operation: string | undefined;
    if (methodName === "fetch") {
      const first = resolve(node.arguments[0]);
      const request = first && ts.isNewExpression(first) && ts.isIdentifier(first.expression) && first.expression.text === "Request" ? first : undefined;
      const url = literal(request ? request.arguments?.[0] : node.arguments[0]);
      if (url && /^https:\/\/(?:api-m|api)\.(?:sandbox\.)?paypal\.com\//.test(url)) {
        paymentAdapter = "raw_http";
        endpoint = url.replace(/^https:\/\/[^/]+/, "").split(/[?#]/)[0];
        const init = request ? request.arguments?.[1] : node.arguments[1];
        const outer = init ? fields(init) : { values: new Map<string, ts.Expression>(), unknown: false };
        method = literal(outer.values.get("method"))?.toUpperCase() ?? (outer.unknown ? undefined : "GET");
        const headers = outer.values.has("headers") ? fields(outer.values.get("headers")) : { values: new Map<string, ts.Expression>(), unknown: false };
        options = { values: headers.values, unknown: outer.unknown || headers.unknown };
        const family = endpoint?.endsWith("/capture") ? "capture" : endpoint?.endsWith("/refund") ? "refund" : endpoint?.endsWith("/authorize") ? "authorization" : endpoint === "/v2/checkout/orders" ? "order creation" : "resource";
        operation = `${method ?? "UNKNOWN"} PayPal ${family}`;
      }
    } else if (paymentAdapter && paymentMethods.test(methodName)) {
      operation = methodName; method = /^get|^read/i.test(methodName) ? "GET" : "POST"; options = fields(node.arguments[0]);
      if (options.values.has("headers")) { const headers = fields(options.values.get("headers")); for (const [key, value] of headers.values) options.values.set(key, value); options.unknown ||= headers.unknown; }
    } else if (/^(?:createOrder|captureOrder|refundCapturedPayment|captureAuthorizedPayment|authorizeOrder|getOrder|getCapturedPayment)$/.test(methodName) || (methodName === "execute" && /^(?:create_order|capture_order|refund_capture|authorize_order|capture_authorization|void_authorization)$/.test(literal(fields(node.arguments[0]).values.get("kind")) ?? ""))) {
      paymentAdapter = "unresolved"; operation = methodName;
    }
    if (operation) {
      const identityValue = options.values.get(paymentAdapter === "raw_http" ? "paypal-request-id" : "paypalrequestid");
      const empty = identityValue && (identityValue.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(identityValue) && identityValue.text === "undefined") || literal(identityValue) === "");
      const identity = options.unknown || ["legacy_paypal", "unresolved"].includes(paymentAdapter ?? "") ? "unknown" : identityValue && !empty ? "present" : "absent";
      const payment = graph.addNode("provider_operation", safeLabel(operation, methodName || "Payment operation"), ref(node), "typescript_ast", paymentAdapter === "unresolved" ? "unresolved" : "syntax", { adapter: paymentAdapter ?? "unresolved", operation: safeLabel(operation, methodName), identity });
      providerCalls.set(node, payment); graph.addEdge(context.id, payment.id, "calls", payment.evidence, payment.confidence);
      if (identityValue && !empty) {
        const identityNode = graph.addNode("identity", "Supplied request identity", ref(identityValue), "typescript_ast", identity === "present" ? "syntax" : "unresolved");
        graph.addEdge(payment.id, identityNode.id, "supplies_identity", identityNode.evidence, identityNode.confidence);
      }
      const mutation = method && !["GET", "HEAD", "OPTIONS"].includes(method);
      if (mutation && identity === "absent") graph.addFinding({ category: "missing_provider_identity", severity: "risk", title: "Payment write has no resolved provider request identity", explanation: "No provider request identity is statically supplied at this call. A wrapper or runtime header needs separate evidence; this is not a reproduced duplicate.", nodeIds: [payment.id], evidence: [payment.evidence] });
      if (identity === "unknown") graph.addFinding({ category: "unresolved_payment_call", severity: "unverified", title: "Payment call requires adapter inspection", explanation: "Dynamic options, a delegated wrapper or an unresolved receiver prevent identity and operation-contract verification.", nodeIds: [payment.id], evidence: [payment.evidence] });
      if (options.values.has("idempotency-key") && identity !== "present") graph.addFinding({ category: "generic_identity_reliance", severity: "unverified", title: "Generic identity needs endpoint evidence", explanation: "A generic Idempotency-Key appears without a resolved provider request identity. F9 must establish endpoint-specific enforcement; static source cannot settle it.", nodeIds: [payment.id], evidence: [payment.evidence], providerFactId: "F9" });
      if (method === "GET") { const reread = graph.addNode("reconciliation", "Provider resource read", ref(node), "typescript_ast", "inferred"); reconciliations.push({ call: node, node: reread }); graph.addEdge(payment.id, reread.id, "may_reconcile", reread.evidence, "inferred"); }
    }
    if (readMethods.test(methodName)) {
      const reread = graph.addNode("reconciliation", safeLabel(methodName), ref(node), "typescript_ast", "inferred");
      reconciliations.push({ call: node, node: reread }); graph.addEdge(context.id, reread.id, "may_reconcile", reread.evidence, "inferred");
    }
    if (/verify.*(?:webhook|signature)|ingestWebhook/i.test(methodName) || (methodName === "verify" && /webhook|signature/i.test(receiver))) verifies.push(node);
    const sql = methodName === "query" || methodName === "execute" || methodName === "run" ? literal(node.arguments[0]) : undefined;
    const fulfillment = fulfillMethods.test(methodName) || !!(sql && /\bINSERT\s+INTO\s+(?:["`]?\w*["`]?\.)?["`]?\w*(?:fulfillment|entitlement|ticket)\w*/i.test(sql));
    if (fulfillment) {
      const effect = graph.addNode("fulfillment", "Fulfillment side effect", ref(node), "typescript_ast", "inferred");
      fulfillments.push({ call: node, node: effect }); graph.addEdge(context.id, effect.id, "may_fulfill", effect.evidence, "inferred");
    }
    if (/^(?:setTargetState|updateOrder|savePayment|setStatus|saveOrder|updatePayment)$/.test(methodName) || (sql && /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(sql))) {
      const write = graph.addNode("state_write", "Application state write", ref(node), "typescript_ast", "inferred"); graph.addEdge(context.id, write.id, "writes", write.evidence, "inferred");
    }
    if (/^(?:get|post|put|patch|delete|all)$/.test(methodName) && /^\//.test(literal(node.arguments[0]) ?? "")) {
      const route = graph.addNode("route", `HTTP ${methodName.toUpperCase()} route`, ref(node), "typescript_ast", "inferred"); graph.addEdge(context.id, route.id, "contains", route.evidence, "inferred");
      for (const handler of node.arguments.slice(1)) {
        const bound = ts.isIdentifier(handler) ? lookup(handler, handler.text) : undefined;
        const targetAst = functionNodes.has(handler) ? handler : bound && (functionNodes.has(bound.node) ? bound.node : bound.initializer && functionNodes.has(bound.initializer) ? bound.initializer : undefined);
        const target = targetAst && functionNodes.get(targetAst);
        if (target && targetAst) {
          graph.addEdge(route.id, target.id, "handles", route.evidence, "inferred");
          if (/webhook|notification/i.test(literal(node.arguments[0]) ?? "")) webhookContexts.add(targetAst);
        }
      }
    }
    if (ts.isIdentifier(expression)) {
      const binding = lookup(expression, expression.text);
      const target = binding && !binding.invalid && (functionNodes.get(binding.node) || (binding.initializer && functionNodes.get(binding.initializer)));
      if (target) graph.addEdge(context.id, target.id, "calls", { type: "typescript_ast", source: ref(node) });
      else if (binding?.module) {
        const unresolved = graph.addNode("function", `Imported call ${safeLabel(expression.text)}`, ref(node), "static_unresolved", "unresolved"); graph.addEdge(context.id, unresolved.id, "unknown_target", unresolved.evidence, "unresolved");
      }
    }
  }
  for (const node of all) if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && /^(?:status|state|paid|fulfilled)$/.test(node.left.name.text)) {
    const write = graph.addNode("state_write", `Write ${node.left.name.text}`, ref(node), "typescript_ast"); graph.addEdge(owner(node).id, write.id, "writes", write.evidence);
  }
  const sameFunction = (a: ts.Node, b: ts.Node) => functionOwnerAst(a) === functionOwnerAst(b);
  const within = (child: ts.Node, parent: ts.Node) => child.pos >= parent.pos && child.end <= parent.end;
  for (const node of all) if (ts.isCatchClause(node) && ts.isTryStatement(node.parent)) {
    const writes = all.filter((item): item is ts.BinaryExpression => ts.isBinaryExpression(item) && within(item, node.block) && item.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(item.left) && item.left.name.text === "status" && literal(item.right) === "failed" && sameFunction(item, node));
    const calls = [...providerCalls.entries()].filter(([call, value]) => within(call, node.parent.tryBlock) && value.operation && !/^GET |^get/i.test(value.operation));
    const reads = reconciliations.filter(item => within(item.call, node.block) && sameFunction(item.call, node));
    if (writes.length && calls.length && !reads.length) graph.addFinding({ category: "unknown_outcome_without_reread", severity: "risk", title: "Failure branch needs unknown-outcome reconciliation", explanation: "A catch around a payment write assigns failed without a recognized resource reread in that branch. Refusal guards, delegated helpers and whether the request was sent require runtime review.", nodeIds: calls.map(([, value]) => value.id), evidence: writes.map(item => ({ type: "typescript_ast" as const, source: ref(item) })) });
  }
  for (const [node, fn] of functionNodes) {
    const name = isFunction(node) ? functionName(node) : "";
    if (!webhookContexts.has(node) && !(/webhook|notification/i.test(name) && !/verify|signature|parse|normalize|build/i.test(name)) && !(/webhooks?/i.test(manifest.path) && /^(?:POST|handler|Anonymous function)$/.test(name))) continue;
    const webhook = graph.addNode("webhook", "Webhook handler", ref(node), "typescript_ast", "inferred"); graph.addEdge(webhook.id, fn.id, "handles", webhook.evidence, "inferred");
    if (!verifies.some(call => functionOwnerAst(call) === node)) graph.addFinding({ category: "unverified_webhook", severity: "risk", title: "Webhook signature verification is unresolved", explanation: "No recognized signature-verification call appears directly in this handler. Middleware or a delegated helper may verify it; source inspection alone cannot establish authenticity or a defect.", nodeIds: [webhook.id], evidence: [webhook.evidence] });
  }
  const unwrap = (value: ts.Expression): ts.Expression => ts.isParenthesizedExpression(value) || ts.isNonNullExpression(value) || ts.isAsExpression(value) ? unwrap(value.expression) : value;
  function completionSubject(value: ts.Expression, negative = false): ts.Identifier | undefined {
    const expression = unwrap(value);
    if (!ts.isBinaryExpression(expression) || expression.operatorToken.kind !== (negative ? ts.SyntaxKind.ExclamationEqualsEqualsToken : ts.SyntaxKind.EqualsEqualsEqualsToken)) return undefined;
    const subject = literal(expression.right) === "COMPLETED" ? expression.left : literal(expression.left) === "COMPLETED" ? expression.right : undefined;
    return subject && ts.isPropertyAccessExpression(subject) && subject.name.text === "status" ? rootIdentifier(subject.expression) : undefined;
  }
  function usesSameBinding(container: ts.Node, identifier: ts.Identifier): boolean {
    const binding = lookup(identifier, identifier.text);
    return all.some(child => within(child, container) && ts.isIdentifier(child) && child.text === identifier.text && lookup(child, child.text) === binding);
  }
  function dependsOnCapture(value: ts.Node, seen = new Set<Binding>(), depth = 0): boolean {
    if (depth > 20) return false;
    for (const child of all) if (within(child, value)) {
      if (ts.isCallExpression(child)) { const operation = providerCalls.get(child)?.operation; if (operation && /capture|^GET |^get/i.test(operation)) return true; }
      if (ts.isIdentifier(child)) {
        const binding = lookup(child, child.text);
        if (binding?.initializer && !binding.invalid && !seen.has(binding) && dependsOnCapture(binding.initializer, new Set([...seen, binding]), depth + 1)) return true;
      }
    }
    return false;
  }
  function terminates(statement: ts.Statement): boolean {
    return ts.isReturnStatement(statement) || ts.isThrowStatement(statement) || (ts.isBlock(statement) && !!statement.statements.length && terminates(statement.statements[statement.statements.length - 1]!));
  }
  function completionPredicate(value: ts.Expression): boolean {
    const expression = unwrap(value);
    if (completionSubject(expression)) return true;
    return ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && (completionPredicate(expression.left) || completionPredicate(expression.right));
  }
  function completedSelection(identifier: ts.Identifier): boolean {
    const binding = lookup(identifier, identifier.text), initial = binding?.initializer && unwrap(binding.initializer);
    if (!binding || binding.invalid || !initial || !ts.isCallExpression(initial) || !ts.isPropertyAccessExpression(initial.expression) || initial.expression.name.text !== "find" || !dependsOnCapture(initial)) return false;
    const predicate = initial.arguments[0];
    if (!predicate || (!ts.isArrowFunction(predicate) && !ts.isFunctionExpression(predicate))) return false;
    if (!ts.isBlock(predicate.body)) return completionPredicate(predicate.body);
    return predicate.body.statements.length === 1 && ts.isReturnStatement(predicate.body.statements[0]!) && !!predicate.body.statements[0]!.expression && completionPredicate(predicate.body.statements[0]!.expression!);
  }
  for (const { call, node } of fulfillments) {
    const matchingCalls = [...providerCalls.entries()].filter(([candidate]) => sameFunction(candidate, call) && candidate.pos < call.pos);
    let guarded = false;
    for (let parent: ts.Node | undefined = call.parent; parent && !isFunction(parent); parent = parent.parent) {
      if (ts.isIfStatement(parent) && within(call, parent.thenStatement)) {
        const subject = completionSubject(parent.expression), binding = subject && lookup(subject, subject.text);
        if (subject && binding?.initializer && !binding.invalid && usesSameBinding(call, subject) && dependsOnCapture(binding.initializer)) guarded = true;
      }
    }
    let callBlock: ts.Node = call;
    while (callBlock.parent && !ts.isBlock(callBlock.parent) && !isFunction(callBlock.parent)) callBlock = callBlock.parent;
    if (!guarded) for (const candidate of all) if (ts.isIfStatement(candidate) && candidate.parent === callBlock.parent && candidate.end <= call.getStart(file) && terminates(candidate.thenStatement)) {
      const negative = completionSubject(candidate.expression, true);
      if (negative && usesSameBinding(call, negative)) { const binding = lookup(negative, negative.text); if (binding?.initializer && !binding.invalid && dependsOnCapture(binding.initializer)) guarded = true; }
      const condition = unwrap(candidate.expression);
      if (ts.isPrefixUnaryExpression(condition) && condition.operator === ts.SyntaxKind.ExclamationToken && ts.isIdentifier(condition.operand) && usesSameBinding(call, condition.operand) && completedSelection(condition.operand)) guarded = true;
    }
    if (!guarded) graph.addFinding({ category: "fulfillment_without_capture_evidence", severity: "risk", title: "Fulfillment needs completed capture evidence", explanation: "No recognized completed-capture guard protects this fulfillment syntax. An approved order, a returned object or an unseen helper does not by itself prove a completed capture; reproduce the journey before confirming a defect.", nodeIds: [node.id], evidence: [node.evidence] });
    for (const [, payment] of matchingCalls) graph.addEdge(payment.id, node.id, "may_fulfill", node.evidence, "inferred");
  }
  return graph.fragment();
}

export function inspectDeclaredTools(source: InspectedSource, limits: SourceImportLimits): DeclaredSourceTool[] {
  const { manifest, content } = source;
  const tools: DeclaredSourceTool[] = [];
  const add = (name: string, command: string, start: number, end: number, kind: DeclaredSourceTool["kind"]) => {
    const span = sourceSpan(manifest.path, manifest.hash, content, start, end);
    tools.push({ id: `tool_${objectHash({ span, name }).slice(0, 32)}`, name: safeLabel(name, "Declared command"), kind, commandHash: digest(command), source: span, shellSyntax: /[;&|`<>]|\$\(/.test(command), outboundOrigins: discoveredOrigins(command), trust: "untrusted_declaration", execution: "not_executed" });
    if (tools.length > limits.maxGraphNodes) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
  };
  if (/(?:^|\/)package\.json$/.test(manifest.path)) {
    const parsed = ts.parseJsonText(manifest.path, content);
    if ((parsed as ts.JsonSourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) throw new SourceWorkspaceError("SOURCE_PARSE_FAILED");
    try { JSON.parse(content.replace(/^\uFEFF/, "")); } catch { throw new SourceWorkspaceError("SOURCE_PARSE_FAILED"); }
    let count = 0;
    const queue: { node: ts.Node; depth: number }[] = [{ node: parsed, depth: 0 }];
    while (queue.length) {
      const entry = queue.pop()!;
      if (++count > limits.maxParserNodes || entry.depth > limits.maxSyntaxDepth) throw new SourceWorkspaceError("SOURCE_PARSER_LIMIT");
      ts.forEachChild(entry.node, child => { queue.push({ node: child, depth: entry.depth + 1 }); });
    }
    const root = parsed.statements[0]?.expression;
    if (root && ts.isObjectLiteralExpression(root)) for (const property of root.properties) {
      if (!ts.isPropertyAssignment(property) || property.name.getText(parsed).replace(/^['"]|['"]$/g, "") !== "scripts" || !ts.isObjectLiteralExpression(property.initializer)) continue;
      for (const script of property.initializer.properties) if (ts.isPropertyAssignment(script) && ts.isStringLiteralLike(script.initializer)) add(script.name.getText(parsed).replace(/^['"]|['"]$/g, ""), script.initializer.text, script.getStart(parsed), script.getEnd(), "package_script");
    }
  } else if (/(?:^|\/)Makefile$/.test(manifest.path)) {
    for (const match of content.matchAll(/^([A-Za-z0-9_.-]+):[^\n]*\n((?:\t[^\n]*(?:\n|$))*)/gm)) add(match[1]!, match[2]!, match.index, match.index + match[0].length, "make_target");
  } else if (/(?:^|\/)Dockerfile$/.test(manifest.path)) {
    for (const match of content.matchAll(/^(RUN|CMD|ENTRYPOINT)\s+([^\n]*(?:\\\n[^\n]*)*)/gm)) add(match[1]!, match[2]!, match.index, match.index + match[0].length, "container_instruction");
  } else if (/(?:^|\/)pyproject\.toml$/.test(manifest.path)) {
    for (const match of content.matchAll(/^(build-backend|requires)\s*=\s*([^\n]+)/gm)) add(match[1]!, match[2]!, match.index, match.index + match[0].length, "python_build");
  }
  return tools;
}
