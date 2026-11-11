from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Refund, RefundRequest, Money
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def apply(c: Context, batch_id: str, item: Data, refund: Refund) -> Data:
    key=str(item['refundIntentId'])
    data=refund.to_dict(exclude_unset=True)
    if not isinstance(refund.id,str) or data.get('custom_id')!=key or data.get('amount',{}).get('currency_code')!=item['currency'] or Decimal(str(data.get('amount',{}).get('value','0')))*100!=item['amountMinor']: return {'refundIntentId':key,'status':'unknown'}
    state='completed' if refund.status=='COMPLETED' else 'pending' if refund.status=='PENDING' else 'unknown'
    c.store.patch('reservations',key,{'state':state,'refundId':refund.id})
    if state=='completed':
        try: c.store.insert('batch_refunds',key,{'batchId':batch_id,'refundId':refund.id,'amountMinor':item['amountMinor']})
        except StoreError as error:
            if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
    return {'refundIntentId':key,'status':state,'refundId':refund.id}

def replay(c: Context, batch_id: str, item: Data, old: Data) -> Data:
    key=str(item['refundIntentId'])
    if old['state'] in {'refused','not_sent'}: return {'refundIntentId':key,'status':old['state']}
    if not old.get('refundId'): return {'refundIntentId':key,'status':'unknown'}
    try: refund=c.client.payments.get_refund(str(old['refundId']))
    except (ApiError,httpx2.RequestError,ValidationError): return {'refundIntentId':key,'status':'unknown'}
    return apply(c,batch_id,item,refund)

def execute(c: Context, batch_id: str, item: Data, limit: int) -> Data:
    key=str(item['refundIntentId'])
    old=c.store.get('reservations',key)
    if old is not None: return replay(c,batch_id,item,old)
    try: c.store.reserve(key,str(item['captureId']),int(item['amountMinor']),limit,{'captureId':item['captureId'],'batchId':batch_id,'requestId':c.request_id('lantern-refund',key)})
    except StoreError as error:
        if error.code=='CAPACITY_EXCEEDED': return {'refundIntentId':key,'status':'capacity'}
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
        winner=c.store.get('reservations',key)
        return replay(c,batch_id,item,winner) if winner is not None else {'refundIntentId':key,'status':'unknown'}
    try: refund=c.client.payments.refund_captured_payment(str(item['captureId']),body=RefundRequest(amount=Money(currency_code=str(item['currency']),value=f"{int(item['amountMinor'])//100}.{int(item['amountMinor'])%100:02d}"),custom_id=key),pay_pal_request_id=c.request_id('lantern-refund',key),prefer='return=representation')
    except ApiError as error:
        state='not_sent' if isinstance(error.error,OAuthProviderError) else 'refused' if 400<=error.status_code<500 and error.status_code!=408 else 'unknown'
        c.store.patch('reservations',key,{'state':state})
        return {'refundIntentId':key,'status':state}
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout):
        c.store.patch('reservations',key,{'state':'not_sent'})
        return {'refundIntentId':key,'status':'not_sent'}
    except (httpx2.RequestError,ValidationError):
        c.store.patch('reservations',key,{'state':'unknown'})
        return {'refundIntentId':key,'status':'unknown'}
    return apply(c,batch_id,item,refund)

def handle(c: Context, x: Data) -> Data:
    batch_id=str(x['batchId'])
    batch=c.store.get('refund_batches',batch_id)
    if batch is None: return {'status':'missing','httpStatus':404,'items':[]}
    if batch['accountId']!=x['accountId'] or not batch['approved']: return {'status':'forbidden','httpStatus':403,'items':[]}
    items: list[Data]=batch['items']
    limits: dict[str,int]={}
    for item in items:
        intent=c.store.get('intents',str(item['intentId']))
        if intent is None or intent['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403,'items':[]}
        limits[str(item['refundIntentId'])]=int(intent['amountMinor'])
    results=[execute(c,batch_id,item,limits[str(item['refundIntentId'])]) for item in items]
    states={str(item['status']) for item in results}
    state='completed' if states=={'completed'} else 'unknown' if 'unknown' in states else 'pending' if states<={'pending','completed'} else 'capacity' if 'capacity' in states else 'refused' if 'refused' in states else 'not_sent'
    return {'status':state,'httpStatus':200 if state=='completed' else 409 if state=='capacity' else 422 if state=='refused' else 503 if state=='not_sent' else 202,'items':results}
