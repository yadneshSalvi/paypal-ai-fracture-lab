from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Refund, RefundRequest, Money, Error as ProviderError
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def unknown() -> Data:
    return {'status':'unknown','httpStatus':202,'code':'OUTCOME_UNKNOWN','retryable':False}

def apply(c: Context, key: str, permission: Data, refund: Refund) -> Data:
    data=refund.to_dict(exclude_unset=True)
    if not isinstance(refund.id,str) or data.get('custom_id')!=key or data.get('amount',{}).get('currency_code')!=permission['currency'] or Decimal(str(data.get('amount',{}).get('value','0')))*100!=permission['amountMinor']: return unknown()
    state='completed' if refund.status=='COMPLETED' else 'pending' if refund.status=='PENDING' else 'unknown'
    c.store.patch('tool_refunds',key,{'state':state,'refundId':refund.id})
    if state=='unknown': return unknown()
    return {'status':state,'httpStatus':200 if state=='completed' else 202,'code':'REFUND_CONFIRMED' if state=='completed' else 'REFUND_PENDING','retryable':False,'refundId':refund.id}

def handle(c: Context, x: Data) -> Data:
    p=c.store.get('tool_permissions',str(x['permissionId']))
    intent=c.store.get('intents',str(p['intentId'])) if p is not None else None
    if p is None or intent is None or p['accountId']!=x['accountId'] or intent['accountId']!=x['accountId'] or not p['approved'] or not intent['authorized'] or p['operation']!='refund' or x['operation']!='refund' or p['captureId']!=x['captureId'] or p['amountMinor']!=x['amountMinor'] or not 0<int(p['amountMinor'])<=int(p['maximumMinor']): return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    key=str(p['refundIntentId'])
    old=c.store.get('tool_refunds',key)
    if old is not None and old.get('refundId'):
        try: refund=c.client.payments.get_refund(str(old['refundId']))
        except (ApiError,httpx2.RequestError,ValidationError): return unknown()
        return apply(c,key,p,refund)
    if old is not None and old['state']=='refused': return {'status':'refused','httpStatus':422,'code':old['code'],'retryable':False}
    if old is not None and old['state'] not in {'not_sent','rate_limited'}: return unknown()
    request_id=c.request_id('errand-python-refund',key)
    try:
        if old is None: c.store.insert('tool_refunds',key,{'state':'unknown','requestId':request_id,'captureId':p['captureId'],'amountMinor':p['amountMinor'],'currency':p['currency']})
        else: c.store.patch('tool_refunds',key,{'state':'unknown'},int(old['version']))
    except StoreError as error:
        if error.code not in {'SQLITE_CONSTRAINT_UNIQUE','VERSION_CONFLICT'}: raise
        return unknown()
    try: refund=c.client.payments.refund_captured_payment(str(p['captureId']),body=RefundRequest(amount=Money(currency_code=str(p['currency']),value=f"{int(p['amountMinor'])//100}.{int(p['amountMinor'])%100:02d}"),custom_id=key),pay_pal_request_id=request_id,prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError):
            c.store.patch('tool_refunds',key,{'state':'not_sent'})
            return {'status':'not_sent','httpStatus':503,'code':'AUTHENTICATION_UNAVAILABLE','retryable':True}
        if 400<=error.status_code<500 and error.status_code!=408:
            details=error.error.to_dict(exclude_unset=True).get('details',[]) if isinstance(error.error,ProviderError) else []
            code='RATE_LIMITED' if error.status_code==429 else 'PROVIDER_AUTHORIZATION' if error.status_code in {401,403} else str(details[0].get('issue','PROVIDER_REFUSAL')) if details else 'PROVIDER_REFUSAL'
            state='rate_limited' if error.status_code==429 else 'refused'
            c.store.patch('tool_refunds',key,{'state':state,'code':code})
            return {'status':state,'httpStatus':429 if state=='rate_limited' else 422,'code':code,'retryable':state=='rate_limited'}
        return unknown()
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout):
        c.store.patch('tool_refunds',key,{'state':'not_sent'})
        return {'status':'not_sent','httpStatus':503,'code':'REQUEST_NOT_SENT','retryable':True}
    except (httpx2.RequestError,ValidationError): return unknown()
    return apply(c,key,p,refund)
