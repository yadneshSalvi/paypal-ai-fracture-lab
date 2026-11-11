from __future__ import annotations
import hashlib
import importlib.util
import json
import sys
import os
import hmac
from collections.abc import Iterator, Mapping
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit
import httpx2
from paypal import PaypalClient
from paypal.core import ClientCredentials, HttpRequest, HttpResponse, JsonBody, TransportError
from api import StoreError

serial = 0
control = os.fdopen(3,'w',buffering=1)
json_dumps=json.dumps
hmac_new=hmac.new
sha256=hashlib.sha256
bridge_secret:bytes=b''
def send(frame:dict[str,Any])->None:
    payload=json_dumps(frame,separators=(',',':'),ensure_ascii=False)
    signature=hmac_new(bridge_secret,payload.encode(),sha256).hexdigest()
    control.write(json_dumps({'payload':payload,'signature':signature})+'\n')
    control.flush()
class BridgeError(StoreError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code

def rpc(method: str, payload: dict[str, Any]) -> Any:
    global serial
    serial += 1
    send({'kind':'rpc','id':serial,'method':method,'input':payload})
    line=sys.stdin.readline(262145)
    if not line or len(line)>262144:
        raise BridgeError('BRIDGE_CLOSED')
    response=json.loads(line)
    if response.get('id')!=serial:
        raise BridgeError('BRIDGE_SEQUENCE')
    if response.get('error'):
        raise BridgeError(str(response['error']))
    return response.get('value')

@dataclass
class BufferedResponse:
    url: str
    status_code: int
    body: bytes
    headers: Mapping[str,str]=field(default_factory=lambda:{'content-type':'application/json'})
    def read(self) -> bytes: return self.body
    def iter_bytes(self, chunk_size: int | None) -> Iterator[bytes]: yield self.body
    def close(self) -> None: pass

class Transport:
    def send(self, request: HttpRequest) -> HttpResponse:
        url=urlsplit(request.url)
        if url.scheme!='https' or url.netloc!='api-m.sandbox.paypal.com' or url.query or url.fragment:
            error=httpx2.ConnectError('OFFLINE_DESTINATION_DENIED')
            raise TransportError(error) from error
        if request.body is not None and not isinstance(request.body,JsonBody) and url.path!='/v1/oauth2/token':
            raise BridgeError('JSON_ONLY')
        body=request.body.value if isinstance(request.body,JsonBody) else None
        headers={k:v for k,v in request.headers.items() if k in {'paypal-request-id','idempotency-key','prefer','content-type','accept'}}
        response=rpc('wire',{'method':request.method,'path':url.path,'headers':headers,'body':body})
        if response.get('failure'):
            cause=httpx2.ConnectError('OFFLINE_PROVEN_NOT_SENT') if response['failure']=='not_sent' else httpx2.ReadTimeout('OFFLINE_RESPONSE_LOST')
            raise TransportError(cause) from cause
        payload=response.get('rawBody',json.dumps(response.get('body'))).encode()
        return BufferedResponse(request.url,int(response['status']),payload)
    def close(self) -> None: pass

class Store:
    def get(self, table: str, key: str) -> Any: return rpc('store.get',{'table':table,'key':key})
    def list(self, table: str) -> Any: return rpc('store.list',{'table':table})
    def insert(self, table: str, key: str, value: dict[str,Any]) -> Any: return rpc('store.insert',{'table':table,'key':key,'value':value})
    def patch(self, table: str, key: str, value: dict[str,Any], expected_version: int | None=None) -> Any: return rpc('store.patch',{'table':table,'key':key,'value':value,'expectedVersion':expected_version})
    def remove(self, table: str, key: str) -> None: rpc('store.remove',{'table':table,'key':key})
    def reserve(self, key: str, resource: str, amount_minor: int, limit_minor: int, metadata: dict[str,Any]) -> Any: return rpc('store.reserve',{'key':key,'resource':resource,'amountMinor':amount_minor,'limitMinor':limit_minor,'metadata':metadata})

class Context:
    def __init__(self, client: PaypalClient) -> None:
        self.client=client
        self.store=Store()
    def request_id(self, *parts: str) -> str:
        h=hashlib.sha256(json.dumps(parts,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
        return f'{h[:8]}-{h[8:12]}-4{h[13:16]}-a{h[17:20]}-{h[20:32]}'
    def verify(self, event: dict[str,Any]) -> bool: return bool(rpc('verify',event))

frame=json.loads(sys.stdin.readline(262145))
bridge_secret=bytes.fromhex(frame.pop('bridgeSecret'))
try:
    spec=importlib.util.spec_from_file_location('candidate','/tmp/work/candidate.py')
    if spec is None or spec.loader is None: raise BridgeError('MISSING_CANDIDATE')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with PaypalClient(base_url='https://api-m.sandbox.paypal.com',timeout=5,retry_options=0,custom_http_client=Transport(),oauth2=ClientCredentials(client_id='OFFLINE-FICTIONAL-ID',client_secret='OFFLINE-FICTIONAL-SECRET')) as client:
        result=module.handle(Context(client),frame['command'])
    send({'kind':'return','value':result})
except Exception as error:
    send({'kind':'return','error':{'name':type(error).__name__[:80],'code':str(getattr(error,'code','UNCAUGHT_TARGET_ERROR'))[:100],'message':str(error)[:600]}})
control.flush()
