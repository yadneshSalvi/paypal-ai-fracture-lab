from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Order, OrderRequest, PurchaseUnitRequest, AmountWithBreakdown, OrderCaptureRequest
from decimal import Decimal
import httpx2
from pydantic import ValidationError

def fulfill(c: Context, key: str, quote: Data, order: Order) -> Data:
    body=order.to_dict(exclude_unset=True)
    captures=[payment for unit in body.get('purchase_units',[]) if unit.get('custom_id')==key for payment in unit.get('payments',{}).get('captures',[])]
    paid=[payment for payment in captures if payment.get('status')=='COMPLETED' and isinstance(payment.get('id'),str) and payment.get('amount',{}).get('currency_code')==quote['currency'] and Decimal(str(payment.get('amount',{}).get('value','0')))*100==quote['amountMinor']]
    if not paid: return {'status':'pending' if any(p.get('status')=='PENDING' for p in captures) else 'unknown','httpStatus':202}
    capture_id=str(paid[0]['id'])
    for seat in quote['seats']:
        try: c.store.insert('tickets',f'{key}:{seat}',{'bookingId':key,'seatId':seat,'captureId':capture_id})
        except StoreError as error:
            if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
    c.store.patch('bookings',key,{'state':'paid','captureId':capture_id})
    return {'status':'paid','httpStatus':200,'captureId':capture_id}

def recover(c: Context, key: str, quote: Data, order_id: str) -> Data:
    try: order=c.client.orders.get_order(order_id)
    except (ApiError,httpx2.RequestError,ValidationError): return {'status':'unknown','httpStatus':202}
    return fulfill(c,key,quote,order)

def handle(c: Context, x: Data) -> Data:
    key=str(x['bookingId'])
    quote=c.store.get('intents',key)
    if quote is None: return {'status':'missing','httpStatus':404}
    if quote['accountId']!=x['accountId'] or not quote['authorized']: return {'status':'forbidden','httpStatus':403}
    if quote['revision']!=x['revision']: return {'status':'conflict','httpStatus':409}
    old=c.store.get('bookings',key)
    if old is None:
        try: c.store.insert('bookings',key,{'state':'creating','revision':quote['revision']})
        except StoreError as error:
            if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
            old=c.store.get('bookings',key)
    if old is not None:
        return recover(c,key,quote,str(old['orderId'])) if old.get('orderId') else {'status':'unknown','httpStatus':202}
    order_id: str | None=None
    try:
        order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=key,amount=AmountWithBreakdown(currency_code=str(quote['currency']),value=f"{int(quote['amountMinor'])//100}.{int(quote['amountMinor'])%100:02d}"))]),pay_pal_request_id=c.request_id('group-booking',key,str(quote['revision']),'create'),prefer='return=representation')
        if not isinstance(order.id,str): return {'status':'unknown','httpStatus':202}
        order_id=order.id
        c.store.patch('bookings',key,{'state':'capturing','orderId':order_id})
        answer=c.client.orders.capture_order(order_id,body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('group-booking',key,str(quote['revision']),'capture'),prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError): return {'status':'not_sent','httpStatus':503}
        if 400<=error.status_code<500 and error.status_code!=408: return {'status':'refused','httpStatus':422}
        return recover(c,key,quote,order_id) if order_id else {'status':'unknown','httpStatus':202}
    except (httpx2.ConnectError,httpx2.ConnectTimeout,httpx2.PoolTimeout): return {'status':'not_sent','httpStatus':503}
    except (httpx2.RequestError,ValidationError):
        return recover(c,key,quote,order_id) if order_id else {'status':'unknown','httpStatus':202}
    return fulfill(c,key,quote,answer)
