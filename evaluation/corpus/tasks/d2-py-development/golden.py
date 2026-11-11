from api import Context, Data, StoreError
from paypal.models import OrderRequest, PurchaseUnitRequest, AmountWithBreakdown
from paypal.core import ApiError, OAuthProviderError
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def handle(c: Context, x: Data) -> Data:
    key=str(x['intentId'])
    quote=c.store.get('intents',key)
    if quote is None: return {'status':'missing','httpStatus':404}
    if quote['accountId']!=x['accountId'] or not quote['authorized']: return {'status':'forbidden','httpStatus':403}
    old=c.store.get('order_requests',key)
    if old is not None and old['state']=='ready': return {'status':'ready','httpStatus':200,'orderId':old['orderId']}
    if old is not None and old['state']!='not_sent': return {'status':'unknown','httpStatus':202}
    request_id=c.request_id('finch-order',key)
    try:
        if old is None: c.store.insert('order_requests',key,{'state':'unknown','requestId':request_id})
        else: c.store.patch('order_requests',key,{'state':'unknown'},int(old['version']))
    except StoreError as error:
        if error.code not in {'SQLITE_CONSTRAINT_UNIQUE','VERSION_CONFLICT'}: raise
        existing=c.store.get('order_requests',key)
        return {'status':'ready','httpStatus':200,'orderId':existing['orderId']} if existing is not None and existing['state']=='ready' else {'status':'unknown','httpStatus':202}
    try:
        order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=key,amount=AmountWithBreakdown(currency_code=str(quote['currency']),value=f"{int(quote['amountMinor'])//100}.{int(quote['amountMinor'])%100:02d}"))]),pay_pal_request_id=request_id,prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError):
            c.store.patch('order_requests',key,{'state':'not_sent'})
            return {'status':'not_sent','httpStatus':503}
        return {'status':'refused','httpStatus':422} if 400<=error.status_code<500 and error.status_code!=408 else {'status':'unknown','httpStatus':202}
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout):
        c.store.patch('order_requests',key,{'state':'not_sent'})
        return {'status':'not_sent','httpStatus':503}
    except (httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    units=order.to_dict(exclude_unset=True).get('purchase_units',[])
    matching=any(p.get('custom_id')==key and p.get('amount',{}).get('currency_code')==quote['currency'] and Decimal(str(p.get('amount',{}).get('value','0')))*100==quote['amountMinor'] for p in units)
    if not isinstance(order.id,str) or not order.id or not matching: return {'status':'unknown','httpStatus':202}
    c.store.patch('order_requests',key,{'state':'ready','orderId':order.id})
    return {'status':'ready','httpStatus':200,'orderId':order.id}
