from api import Context, Data
from paypal.core import ApiError
from paypal.models import OrderCaptureRequest

def handle(c: Context, x: Data) -> Data:
    cart=c.store.get('carts',str(x['cartId']))
    quote=c.store.get('intents',str(x['quoteId']))
    if cart is None or quote is None: return {'status':'missing','httpStatus':404}
    if cart['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    old=c.store.get('cart_payments',str(x['cartId']))
    if old is not None: return {'status':'paid','httpStatus':200,'captureId':old['captureId']}
    try:
        order=c.client.orders.capture_order(str(x['orderId']),body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('cart',str(x['orderId'])),prefer='return=representation').to_dict(exclude_unset=True)
        captures=order.get('purchase_units',[{}])[0].get('payments',{}).get('captures',[])
        if not captures or captures[0].get('status')!='COMPLETED': return {'status':'unknown','httpStatus':202}
        capture_id=str(captures[0]['id'])
        c.store.insert('cart_payments',str(x['cartId']),{'captureId':capture_id})
        c.store.insert('purchases',str(x['quoteId']),{'quoteId':x['quoteId'],'cartId':x['cartId'],'captureId':capture_id})
        return {'status':'paid','httpStatus':200,'captureId':capture_id}
    except ApiError: return {'status':'unknown','httpStatus':202}
