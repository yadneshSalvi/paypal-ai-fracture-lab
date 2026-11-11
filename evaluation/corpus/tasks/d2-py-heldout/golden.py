from api import Context, Data, StoreError
from paypal.models import Refund, RefundRequest, Money
from paypal.core import ApiError, OAuthProviderError
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def record_refund(c: Context, key: str, record: Data, refund: Refund) -> Data:
    data=refund.to_dict(exclude_unset=True)
    if not isinstance(refund.id,str) or data.get('custom_id')!=key or data.get('amount',{}).get('currency_code')!=record['currency'] or Decimal(str(data.get('amount',{}).get('value','0')))*100!=record['amountMinor']: return {'status':'conflict','httpStatus':409}
    if refund.status not in {'COMPLETED','PENDING'}: return {'status':'unknown','httpStatus':202}
    state='completed' if refund.status=='COMPLETED' else 'pending'
    c.store.patch('refund_intents',key,{'state':state,'refundId':refund.id})
    return {'status':state,'httpStatus':200 if state=='completed' else 202,'refundId':refund.id}

def recover(c: Context, key: str, record: Data, refund_id: str) -> Data:
    try: refund=c.client.payments.get_refund(refund_id)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    return record_refund(c,key,record,refund)

def handle(c: Context, x: Data) -> Data:
    key=str(x['refundIntentId'])
    record=c.store.get('refund_intents',key)
    if record is None: return {'status':'missing','httpStatus':404}
    if record['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    reference=record.get('refundId') or x.get('observedRefundId')
    if reference: return recover(c,key,record,str(reference))
    old=c.store.get('refund_claims',key)
    if old is not None: return {'status':'unknown','httpStatus':202}
    try: c.store.insert('refund_claims',key,{'state':'unknown','captureId':record['captureId'],'amountMinor':record['amountMinor']})
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
        return {'status':'unknown','httpStatus':202}
    try:
        refund=c.client.payments.refund_captured_payment(str(record['captureId']),body=RefundRequest(amount=Money(currency_code=str(record['currency']),value=f"{int(record['amountMinor'])//100}.{int(record['amountMinor'])%100:02d}"),custom_id=key),pay_pal_request_id=c.request_id('cedar-refund',key),prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError): return {'status':'not_sent','httpStatus':503}
        return {'status':'refused','httpStatus':422} if 400<=error.status_code<500 and error.status_code!=408 else {'status':'unknown','httpStatus':202}
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout): return {'status':'not_sent','httpStatus':503}
    except (httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    if not isinstance(refund.id,str): return {'status':'unknown','httpStatus':202}
    result=record_refund(c,key,record,refund)
    return recover(c,key,record,refund.id) if result['status']=='unknown' else result
