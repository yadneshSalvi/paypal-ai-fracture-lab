import ast
import json
import sys

source=sys.stdin.read(120001)
findings: list[dict[str,object]]=[]
def reject(node: ast.AST, code: str) -> None:
    findings.append({'line':getattr(node,'lineno',1),'code':code})
allowed={'api','paypal','typing','collections','dataclasses','decimal','enum','hashlib','json','math','re','uuid','httpx2','pydantic','__future__'}
forbidden={'eval','exec','compile','open','input','globals','locals','vars','dir','getattr','setattr','delattr','hasattr','__import__','breakpoint','help','memoryview','PaypalClient','print','exit','quit'}
try:
    tree=ast.parse(source)
    http_aliases={'httpx2'}
    http_exceptions={'HTTPError','RequestError','TransportError','TimeoutException','ConnectTimeout','ReadTimeout','WriteTimeout','PoolTimeout','NetworkError','ReadError','WriteError','ConnectError','CloseError','ProxyError','UnsupportedProtocol','ProtocolError','LocalProtocolError','RemoteProtocolError','DecodingError','TooManyRedirects','HTTPStatusError','InvalidURL','CookieConflict','StreamError','StreamConsumed','StreamClosed','ResponseNotRead','RequestNotRead'}
    for node in ast.walk(tree):
        if isinstance(node,ast.Import):
            for name in node.names:
                if name.name.split('.')[0] not in allowed: reject(node,'IMPORT_BOUNDARY')
                if name.name=='httpx2': http_aliases.add(name.asname or name.name)
        if isinstance(node,ast.ImportFrom) and (node.module or '').split('.')[0]=='httpx2':
            if node.module!='httpx2' or any(name.name not in http_exceptions for name in node.names): reject(node,'NETWORK_CAPABILITY')
        if isinstance(node,ast.ImportFrom) and (node.level or (node.module or '').split('.')[0] not in allowed): reject(node,'IMPORT_BOUNDARY')
        if isinstance(node,ast.Name) and (node.id in forbidden or node.id.startswith('__') and node.id not in {'__future__'}): reject(node,'AMBIENT_CAPABILITY')
        if isinstance(node,ast.Attribute) and (node.attr.startswith('_') or node.attr in {'send','custom_http_client','transport','oauth2'}): reject(node,'REFLECTION_OR_TRANSPORT')
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id=='cast': reject(node,'TYPE_SUPPRESSION')
        if isinstance(node,ast.ExceptHandler):
            broad=node.type is None or isinstance(node.type,ast.Name) and node.type.id in {'Exception','BaseException'}
            if broad and not any(isinstance(n,ast.Raise) for statement in node.body for n in ast.walk(statement)): reject(node,'UNCLASSIFIED_BROAD_CATCH')
    for node in ast.walk(tree):
        if isinstance(node,ast.Attribute) and isinstance(node.value,ast.Name) and node.value.id in http_aliases and node.attr not in http_exceptions: reject(node,'NETWORK_CAPABILITY')
    if '# type: ignore' in source or '# mypy:' in source: findings.append({'line':1,'code':'TYPE_SUPPRESSION'})
except SyntaxError:
    pass  # Compilation records syntax errors independently.
print(json.dumps({'passed':not findings,'findings':findings}))
