"""Trusted AST inspector. Repository text is passed to ast.parse, never exec/import/eval."""
import ast
import json
import re
import resource
import sys
from urllib.parse import urlsplit

resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
memory_limit_applied = False
try:
    resource.setrlimit(resource.RLIMIT_DATA, (256 * 1024 * 1024, 256 * 1024 * 1024))
    memory_limit_applied = True
except (ValueError, OSError):
    # Darwin can refuse lowering DATA/AS/RSS limits. The response reports that gate honestly.
    pass
sys.setrecursionlimit(1000)


def inspect(item, limits):
    source = item["content"]
    if len(source.encode("utf-8")) > min(limits["maxFileBytes"], 128 * 1024):
        raise OverflowError()
    tree = ast.parse(source, filename="source.py", mode="exec")
    flat = []
    parents = {}
    queue = [(tree, 0)]
    while queue:
        node, depth = queue.pop()
        if len(flat) >= limits["maxParserNodes"] or depth > limits["maxSyntaxDepth"]:
            raise OverflowError()
        flat.append(node)
        for child in ast.iter_child_nodes(node):
            parents[child] = node
            queue.append((child, depth + 1))
    nodes, edges, risks = [], [], []
    mapped = {}

    def add(kind, label, node, **extra):
        index = len(nodes)
        nodes.append(dict(id=index, kind=kind, label=label, line=getattr(node, "lineno", 1), column=getattr(node, "col_offset", 0), endLine=getattr(node, "end_lineno", 1), endColumn=getattr(node, "end_col_offset", 0), **extra))
        if len(nodes) > limits["maxGraphNodes"]:
            raise OverflowError()
        return index

    def edge(a, b, relation, node):
        edges.append(dict(a=a, b=b, relation=relation, node=node))

    def owner_ast(node):
        current = parents.get(node)
        while current:
            if isinstance(current, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                return current
            current = parents.get(current)
        return tree

    file_node = add("file", item["manifest"]["path"], tree)
    for node in flat:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            mapped[node] = add("function", getattr(node, "name", "Anonymous function"), node)
            edge(file_node, mapped[node], "contains", mapped[node])

    def owner(node):
        return mapped.get(owner_ast(node), file_node)

    bindings = {}
    ambiguous = set()
    imported = {}
    for node in flat:
        scope = owner_ast(node)
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            module = node.module if isinstance(node, ast.ImportFrom) else ""
            for alias in node.names:
                name = alias.asname or alias.name.split(".")[0]
                key = (scope, name)
                if key in imported or key in bindings:
                    ambiguous.add(key)
                imported[key] = module or alias.name
                module_node = add("module", module or alias.name, node)
                edge(file_node, module_node, "imports", module_node)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            for argument in node.args.posonlyargs + node.args.args + node.args.kwonlyargs:
                ambiguous.add((node, argument.arg))
        if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                base = target
                while isinstance(base, (ast.Attribute, ast.Subscript)):
                    base = base.value
                if isinstance(base, ast.Name):
                    key = (scope, base.id)
                    if not isinstance(target, ast.Name) or isinstance(node, ast.AugAssign) or key in bindings:
                        ambiguous.add(key)
                    elif node.value:
                        bindings[key] = node.value

    def key_for(node, name):
        scope = owner_ast(node)
        if (scope, name) in bindings or (scope, name) in imported or (scope, name) in ambiguous:
            return (scope, name)
        return (tree, name)

    def resolve(node, seen=None):
        seen = seen or set()
        if isinstance(node, ast.Name):
            key = key_for(node, node.id)
            if key in ambiguous or key in seen:
                return None
            return resolve(bindings.get(key), seen | {key})
        return node

    def literal(node):
        value = resolve(node)
        if isinstance(value, ast.Constant) and isinstance(value.value, str):
            return value.value
        if isinstance(value, ast.JoinedStr):
            return "".join(piece.value if isinstance(piece, ast.Constant) and isinstance(piece.value, str) else "{dynamic}" for piece in value.values)
        return None

    def dictionary(node):
        value = resolve(node)
        if not isinstance(value, ast.Dict):
            return {}, True
        fields, unknown = {}, False
        for key, entry in zip(value.keys, value.values):
            name = literal(key)
            if name is None:
                unknown = True
            else:
                fields[name.lower()] = entry
        return fields, unknown

    def adapter(node, seen=None):
        seen = seen or set()
        while isinstance(node, (ast.Attribute, ast.Subscript)):
            node = node.value
        if not isinstance(node, ast.Name):
            return None
        key = key_for(node, node.id)
        if key in ambiguous or key in seen:
            return None
        module = imported.get(key, "").split(".")[0]
        if module == "paypal":
            return "apimatic_context"
        if module in ("paypalrestsdk", "paypalcheckoutsdk"):
            return "legacy_paypal"
        initial = bindings.get(key)
        return adapter(initial.func if isinstance(initial, ast.Call) else initial, seen | {key})

    payment_calls = {}
    reads, verifies, fulfillments = [], [], []
    for node in sorted(flat, key=lambda node: (getattr(node, "lineno", 0), getattr(node, "col_offset", 0))):
        if isinstance(node, ast.arg) and node.arg in ("intent_id", "business_intent_id", "purchase_id", "checkout_id") or isinstance(node, ast.Attribute) and node.attr in ("intent_id", "business_intent_id", "purchase_id", "checkout_id"):
            intent = add("commerce_intent", node.arg if isinstance(node, ast.arg) else node.attr, node)
            edge(owner(node), intent, "contains", intent)
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            for match in re.finditer(r"\b(?:https?|wss?)://[^\s\"'`<>\\{}]+", node.value):
                try:
                    parsed = urlsplit(match.group())
                    if parsed.username or parsed.password or not parsed.hostname:
                        continue
                    origin = parsed.scheme + "://" + parsed.netloc
                    destination = add("outbound_destination", origin, node, origin=origin)
                    edge(owner(node), destination, "targets", destination)
                except ValueError:
                    pass
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                if isinstance(target, ast.Attribute) and target.attr in ("status", "state", "paid", "fulfilled"):
                    write = add("state_write", "Write " + target.attr, node)
                    edge(owner(node), write, "writes", write)
        if not isinstance(node, ast.Call):
            continue
        name = node.func.attr if isinstance(node.func, ast.Attribute) else node.func.id if isinstance(node.func, ast.Name) else ""
        keywords = {keyword.arg: keyword.value for keyword in node.keywords if keyword.arg}
        unknown_keywords = any(keyword.arg is None for keyword in node.keywords)
        payment_adapter = adapter(node.func)
        url = literal(node.args[0]) if node.args else None
        operation = None
        method = None
        options, unknown = keywords, unknown_keywords
        if url and re.match(r"^https://(?:api-m|api)\.(?:sandbox\.)?paypal\.com/", url) and name in ("post", "get", "request", "put", "delete", "urlopen"):
            payment_adapter = "raw_http"
            method = name.upper() if name != "urlopen" else "UNKNOWN"
            operation = method + " PayPal endpoint"
            options, unknown = dictionary(keywords.get("headers")) if "headers" in keywords else ({}, unknown_keywords)
            unknown = unknown or unknown_keywords
        elif payment_adapter and re.match(r"^(create_order|capture_order|authorize_order|refund_captured_payment|capture_authorized_payment|get_order|get_captured_payment|create|capture|refund|execute|authorize|void)$", name):
            operation = name
            method = "GET" if name.startswith("get_") else "POST"
            if node.args:
                options, unknown = dictionary(node.args[0])
                options.update(keywords)
                unknown = unknown or unknown_keywords
        elif re.match(r"^(create_order|capture_order|refund_captured_payment|get_order|get_captured_payment)$", name):
            payment_adapter, operation, unknown = "unresolved", name, True
        if operation:
            identity_value = options.get("paypal-request-id") if payment_adapter == "raw_http" else options.get("paypal_request_id", options.get("pay_pal_request_id"))
            identity = "unknown" if unknown or payment_adapter in ("legacy_paypal", "unresolved") else "present" if identity_value is not None and literal(identity_value) != "" and not (isinstance(identity_value, ast.Constant) and identity_value.value is None) else "absent"
            payment = add("provider_operation", operation, node, adapter=payment_adapter, operation=operation, identity=identity)
            payment_calls[node] = (payment, method)
            edge(owner(node), payment, "calls", payment)
            if method not in ("GET", "UNKNOWN", None) and identity == "absent":
                risks.append(dict(category="missing_provider_identity", node=payment))
            if identity == "unknown":
                risks.append(dict(category="unresolved_payment_call", node=payment))
            if "idempotency-key" in options and identity != "present":
                risks.append(dict(category="generic_identity_reliance", node=payment))
            if identity_value is not None:
                identity_node = add("identity", "Supplied request identity", identity_value)
                edge(payment, identity_node, "supplies_identity", identity_node)
            if method == "GET":
                reread = add("reconciliation", "Provider resource read", node)
                reads.append(node)
                edge(payment, reread, "may_reconcile", reread)
        if re.match(r"^(reconcile|read_order|read_capture|get_order|get_captured_payment|fetch_order|fetch_capture)$", name):
            reread = add("reconciliation", name, node)
            reads.append(node)
            edge(owner(node), reread, "may_reconcile", reread)
        if re.search(r"verify.*(?:webhook|signature)|ingest_webhook", name):
            verifies.append(node)
        sql = literal(node.args[0]) if name in ("execute", "query") and node.args else None
        if re.match(r"^(fulfill|fulfill_order|issue_ticket|issue_tickets|deliver|create_entitlement|grant_entitlement)$", name) or sql and re.search(r"INSERT\s+INTO\s+\w*(?:fulfillment|entitlement|ticket)\w*", sql, re.I):
            effect = add("fulfillment", "Fulfillment side effect", node)
            fulfillments.append((node, effect))
            edge(owner(node), effect, "may_fulfill", effect)
            risks.append(dict(category="fulfillment_without_capture_evidence", node=effect))
        if re.match(r"^(set_state|save_payment|update_order|set_status)$", name) or sql and re.search(r"\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b", sql, re.I):
            write = add("state_write", "Application state write", node)
            edge(owner(node), write, "writes", write)
    for function, index in mapped.items():
        name = getattr(function, "name", "")
        if re.search(r"webhook|notification", name, re.I) and not re.search(r"verify|signature|parse|normalize|build", name, re.I):
            webhook = add("webhook", "Webhook handler", function)
            edge(webhook, index, "handles", webhook)
            if not any(owner_ast(call) is function for call in verifies):
                risks.append(dict(category="unverified_webhook", node=webhook))
    for node in flat:
        if not isinstance(node, ast.Try):
            continue
        body_nodes = set(child for statement in node.body for child in ast.walk(statement))
        writes = [child for handler in node.handlers for child in ast.walk(handler) if isinstance(child, (ast.Assign, ast.AnnAssign)) and literal(child.value) == "failed" and any(isinstance(target, ast.Attribute) and target.attr == "status" or isinstance(target, ast.Subscript) and literal(target.slice) == "status" for target in (child.targets if isinstance(child, ast.Assign) else [child.target]))]
        handler_nodes = set(child for handler in node.handlers for child in ast.walk(handler))
        if writes and any(call in body_nodes and method not in ("GET", None) for call, (_, method) in payment_calls.items()) and not any(call in handler_nodes for call in reads):
            write = add("state_write", "Failed status in exception branch", writes[0])
            risks.append(dict(category="unknown_outcome_without_reread", node=write))
    return dict(path=item["manifest"]["path"], nodes=nodes, edges=edges, risks=risks)


try:
    payload = json.load(sys.stdin)
    result = [inspect(source, payload["limits"]) for source in payload["sources"]]
    print(json.dumps(dict(ok=True, results=result, memoryLimitApplied=memory_limit_applied), separators=(",", ":")))
except (SyntaxError, ValueError, TypeError, KeyError):
    print(json.dumps(dict(ok=False, code="SOURCE_PARSE_FAILED")))
except (MemoryError, RecursionError, OverflowError):
    print(json.dumps(dict(ok=False, code="SOURCE_PARSER_LIMIT")))
