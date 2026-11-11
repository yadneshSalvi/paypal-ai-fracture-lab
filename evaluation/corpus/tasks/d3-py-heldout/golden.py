from api import Context, Data, StoreError
from paypal.core import ApiError
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def once(c: Context, table: str, key: str, value: Data) -> None:
    try: c.store.insert(table,key,value)
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise

def handle(c: Context, x: Data) -> Data:
    event=x['event']
    if not c.verify(event): return {'status':'invalid','httpStatus':401}
    if event['event_type']!='PAYMENT.CAPTURE.COMPLETED': return {'status':'ignored','httpStatus':200}
    order_id=str(event['resource']['order_id'])
    binding=c.store.get('order_bindings',order_id)
    if binding is None: return {'status':'ignored','httpStatus':200}
    key=str(binding['intentId'])
    intent=c.store.get('intents',key)
    if intent is None or intent['accountId']!=x['accountId'] or not intent['authorized']: return {'status':'forbidden','httpStatus':403}
    try: order=c.client.orders.get_order(order_id).to_dict(exclude_unset=True)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':503}
    captures=[capture for unit in order.get('purchase_units',[]) if unit.get('custom_id')==key for capture in unit.get('payments',{}).get('captures',[]) if capture.get('status')=='COMPLETED' and isinstance(capture.get('id'),str) and capture.get('amount',{}).get('currency_code')==intent['currency'] and Decimal(str(capture.get('amount',{}).get('value','0')))*100==intent['amountMinor']]
    if not captures: return {'status':'ignored','httpStatus':200}
    capture_id=str(captures[0]['id'])
    once(c,'entitlements',key,{'captureId':capture_id})
    once(c,'dispatches',key,{'captureId':capture_id})
    return {'status':'accepted','httpStatus':200}
