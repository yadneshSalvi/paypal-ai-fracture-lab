from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Order, OrderCaptureRequest
from decimal import Decimal
import httpx2
from pydantic import ValidationError

def belongs(order: Order, key: str, quote: Data) -> bool:
    return any(p.get('custom_id')==key and p.get('amount',{}).get('currency_code')==quote['currency'] and Decimal(str(p.get('amount',{}).get('value','0')))*100==quote['amountMinor'] for p in order.to_dict(exclude_unset=True).get('purchase_units',[]))

def apply(c: Context, key: str, quote: Data, order: Order) -> Data:
    if not belongs(order,key,quote): return {'status':'forbidden','httpStatus':403}
    payments=[p for unit in order.to_dict(exclude_unset=True).get('purchase_units',[]) if unit.get('custom_id')==key for p in unit.get('payments',{}).get('captures',[])]
    matches=[p for p in payments if p.get('status')=='COMPLETED' and isinstance(p.get('id'),str) and p.get('amount',{}).get('currency_code')==quote['currency'] and Decimal(str(p.get('amount',{}).get('value','0')))*100==quote['amountMinor']]
    if not matches: return {'status':'pending' if any(p.get('status')=='PENDING' for p in payments) else 'unknown','httpStatus':202}
    capture_id=str(matches[0]['id'])
    try: c.store.insert('purchases',key,{'quoteId':key,'cartId':quote['cartId'],'captureId':capture_id})
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
    return {'status':'paid','httpStatus':200,'captureId':capture_id}

def reread(c: Context, key: str, quote: Data, order_id: str) -> Data:
    try: order=c.client.orders.get_order(order_id)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    return apply(c,key,quote,order)

def handle(c: Context, x: Data) -> Data:
    key=str(x['quoteId'])
    cart=c.store.get('carts',str(x['cartId']))
    quote=c.store.get('intents',key)
    if cart is None or quote is None: return {'status':'missing','httpStatus':404}
    if cart['accountId']!=x['accountId'] or quote['cartId']!=x['cartId'] or not quote['authorized'] or x['orderId'] not in quote['orderIds']: return {'status':'forbidden','httpStatus':403}
    if cart['activeQuoteId']!=key: return {'status':'stale','httpStatus':409}
    chosen=c.store.get('quote_claims',key)
    if chosen is not None: return reread(c,key,quote,str(chosen['orderId']))
    try: before=c.client.orders.get_order(str(x['orderId']))
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    if not belongs(before,key,quote): return {'status':'forbidden','httpStatus':403}
    try: c.store.insert('quote_claims',key,{'orderId':x['orderId'],'state':'capturing'})
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
        chosen=c.store.get('quote_claims',key)
        return reread(c,key,quote,str(chosen['orderId'])) if chosen is not None else {'status':'unknown','httpStatus':202}
    try: after=c.client.orders.capture_order(str(x['orderId']),body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('orchard-quote',key,'capture'),prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError): return {'status':'not_sent','httpStatus':503}
        if 400<=error.status_code<500 and error.status_code!=408: return {'status':'refused','httpStatus':422}
        return reread(c,key,quote,str(x['orderId']))
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout): return {'status':'not_sent','httpStatus':503}
    except (httpx2.RequestError,ValidationError): return reread(c,key,quote,str(x['orderId']))
    return apply(c,key,quote,after)
