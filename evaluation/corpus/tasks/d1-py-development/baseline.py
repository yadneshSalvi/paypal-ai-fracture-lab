from api import Context, Data
from paypal.core import ApiError
from paypal.models import OrderRequest, PurchaseUnitRequest, AmountWithBreakdown, OrderCaptureRequest

def handle(c: Context, x: Data) -> Data:
    key=str(x['bookingId'])
    quote=c.store.get('intents',key)
    if quote is None: return {'status':'missing','httpStatus':404}
    if quote['accountId']!=x['accountId'] or not quote['authorized']: return {'status':'forbidden','httpStatus':403}
    try:
        order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=key,amount=AmountWithBreakdown(currency_code='USD',value=f"{int(quote['amountMinor'])/100:.2f}"))]),pay_pal_request_id=c.request_id('booking',str(x['deliveryId'])),prefer='return=representation')
        if not isinstance(order.id,str): return {'status':'unknown','httpStatus':202}
        answer=c.client.orders.capture_order(order.id,body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('capture',str(x['deliveryId'])),prefer='return=representation').to_dict(exclude_unset=True)
        captures=answer.get('purchase_units',[{}])[0].get('payments',{}).get('captures',[])
        if not captures or captures[0].get('status')!='COMPLETED': return {'status':'unknown','httpStatus':202}
        capture_id=str(captures[0]['id'])
        for seat in quote['seats']:
            ticket=f'{key}:{seat}'
            if c.store.get('tickets',ticket) is None: c.store.insert('tickets',ticket,{'bookingId':key,'seatId':seat,'captureId':capture_id})
        return {'status':'paid','httpStatus':200,'captureId':capture_id}
    except ApiError:
        return {'status':'unknown','httpStatus':202}
