from api import Context, Data, StoreError
from paypal.core import ApiError
from decimal import Decimal
from pydantic import ValidationError
import hashlib
import json
import httpx2

def insert_once(c: Context, table: str, key: str, value: Data) -> None:
    try: c.store.insert(table,key,value)
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise

def handle(c: Context, x: Data) -> Data:
    event=x['event']
    if not c.verify(event): return {'status':'invalid','httpStatus':401}
    if event['event_type']!='PAYMENT.CAPTURE.COMPLETED': return {'status':'ignored','httpStatus':200}
    capture_id=str(event['resource']['id'])
    binding=c.store.get('capture_bindings',capture_id)
    if binding is None: return {'status':'ignored','httpStatus':200}
    key=str(binding['intentId'])
    intent=c.store.get('intents',key)
    if intent is None or intent['accountId']!=x['accountId'] or not intent['authorized']: return {'status':'forbidden','httpStatus':403}
    fingerprint=hashlib.sha256(json.dumps(event,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    receipt=c.store.get('webhooks',str(event['id']))
    if receipt is not None: return {'status':'accepted' if receipt['hash']==fingerprint else 'conflict','httpStatus':200 if receipt['hash']==fingerprint else 409}
    try: capture=c.client.payments.get_captured_payment(capture_id).to_dict(exclude_unset=True)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':503}
    if capture.get('id')!=capture_id or capture.get('custom_id')!=key or capture.get('status')!='COMPLETED' or capture.get('amount',{}).get('currency_code')!=intent['currency'] or Decimal(str(capture.get('amount',{}).get('value','0')))*100!=intent['amountMinor']: return {'status':'ignored','httpStatus':200}
    insert_once(c,'entitlements',key,{'captureId':capture_id,'amountMinor':intent['amountMinor']})
    insert_once(c,'notification_outbox',key,{'captureId':capture_id,'kind':'purchase_receipt'})
    insert_once(c,'webhooks',str(event['id']),{'hash':fingerprint,'processed':True})
    winner=c.store.get('webhooks',str(event['id']))
    if winner is not None and winner['hash']!=fingerprint: return {'status':'conflict','httpStatus':409}
    return {'status':'accepted','httpStatus':200}
