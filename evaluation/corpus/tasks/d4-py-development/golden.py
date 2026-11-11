from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Refund, RefundRequest, Money
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def apply(c: Context, key: str, auth: Data, refund: Refund) -> Data:
    data=refund.to_dict(exclude_unset=True)
    if not isinstance(refund.id,str) or data.get('custom_id')!=key or data.get('amount',{}).get('currency_code')!=auth['currency'] or Decimal(str(data.get('amount',{}).get('value','0')))*100!=auth['amountMinor']: return {'status':'unknown','httpStatus':202}
    state='completed' if refund.status=='COMPLETED' else 'pending' if refund.status=='PENDING' else 'unknown'
    c.store.patch('reservations',key,{'state':state,'refundId':refund.id})
    if state=='completed':
        try: c.store.insert('refund_results',key,{'refundId':refund.id,'captureId':auth['captureId'],'amountMinor':auth['amountMinor']})
        except StoreError as error:
            if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
    return {'status':state,'httpStatus':200 if state=='completed' else 202,'refundId':refund.id}

def replay(c: Context, key: str, auth: Data, old: Data) -> Data:
    if old['state'] in {'refused','not_sent'}: return {'status':old['state'],'httpStatus':422 if old['state']=='refused' else 503}
    if not old.get('refundId'): return {'status':'unknown','httpStatus':202}
    try: refund=c.client.payments.get_refund(str(old['refundId']))
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    return apply(c,key,auth,refund)

def handle(c: Context, x: Data) -> Data:
    key=str(x['refundIntentId'])
    auth=c.store.get('refund_authorizations',key)
    if auth is None: return {'status':'missing','httpStatus':404}
    if auth['accountId']!=x['accountId'] or not auth['approved']: return {'status':'forbidden','httpStatus':403}
    old=c.store.get('reservations',key)
    if old is not None: return replay(c,key,auth,old)
    intent=c.store.get('intents',str(auth['intentId']))
    external=c.store.get('refund_external',str(auth['captureId']))
    if intent is None or external is None or intent['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    try: capture=c.client.payments.get_captured_payment(str(auth['captureId'])).to_dict(exclude_unset=True)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    if capture.get('id')!=auth['captureId'] or capture.get('custom_id')!=auth['intentId'] or capture.get('amount',{}).get('currency_code')!=auth['currency'] or Decimal(str(capture.get('amount',{}).get('value','0')))*100!=intent['amountMinor']: return {'status':'forbidden','httpStatus':403}
    limit=int(intent['amountMinor'])-int(external['externalRefundedMinor'])
    try: c.store.reserve(key,str(auth['captureId']),int(auth['amountMinor']),limit,{'captureId':auth['captureId'],'requestId':c.request_id('mosaic-refund',key)})
    except StoreError as error:
        if error.code=='CAPACITY_EXCEEDED': return {'status':'capacity','httpStatus':409}
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
        winner=c.store.get('reservations',key)
        return replay(c,key,auth,winner) if winner is not None else {'status':'unknown','httpStatus':202}
    try: refund=c.client.payments.refund_captured_payment(str(auth['captureId']),body=RefundRequest(amount=Money(currency_code=str(auth['currency']),value=f"{int(auth['amountMinor'])//100}.{int(auth['amountMinor'])%100:02d}"),custom_id=key),pay_pal_request_id=c.request_id('mosaic-refund',key),prefer='return=representation')
    except ApiError as error:
        state='not_sent' if isinstance(error.error,OAuthProviderError) else 'refused' if 400<=error.status_code<500 and error.status_code!=408 else 'unknown'
        c.store.patch('reservations',key,{'state':state})
        return {'status':state,'httpStatus':503 if state=='not_sent' else 422 if state=='refused' else 202}
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout):
        c.store.patch('reservations',key,{'state':'not_sent'})
        return {'status':'not_sent','httpStatus':503}
    except (httpx2.RequestError,ValidationError):
        c.store.patch('reservations',key,{'state':'unknown'})
        return {'status':'unknown','httpStatus':202}
    return apply(c,key,auth,refund)
