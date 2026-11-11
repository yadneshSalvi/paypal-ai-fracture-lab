from api import Context, Data
from paypal.models import OrderRequest, PurchaseUnitRequest, AmountWithBreakdown
from paypal.core import ApiError

def handle(c: Context, x: Data) -> Data:
    key=str(x['intentId'])
    quote=c.store.get('intents',key)
    if quote is None: return {'status':'missing','httpStatus':404}
    if quote['accountId']!=x['accountId'] or not quote['authorized']: return {'status':'forbidden','httpStatus':403}
    try:
        order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=key,amount=AmountWithBreakdown(currency_code=str(quote['currency']),value=f"{int(quote['amountMinor'])/100:.2f}"))]),pay_pal_request_id=c.request_id('create',str(x['deliveryId'])),prefer='return=representation')
        return {'status':'ready','httpStatus':200,'orderId':str(order.id)}
    except ApiError: return {'status':'refused','httpStatus':422}
