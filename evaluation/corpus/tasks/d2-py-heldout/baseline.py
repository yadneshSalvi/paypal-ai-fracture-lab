from api import Context, Data
from paypal.models import RefundRequest, Money
from paypal.core import ApiError

def handle(c: Context, x: Data) -> Data:
    key=str(x['refundIntentId'])
    record=c.store.get('refund_intents',key)
    if record is None: return {'status':'missing','httpStatus':404}
    if record['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    try:
        if x.get('observedRefundId'):
            refund=c.client.payments.get_refund(str(x['observedRefundId']))
        else:
            refund=c.client.payments.refund_captured_payment(str(record['captureId']),body=RefundRequest(amount=Money(currency_code=str(record['currency']),value=f"{int(record['amountMinor'])/100:.2f}"),custom_id=key),prefer='return=representation')
        if refund.status=='COMPLETED':
            c.store.patch('refund_intents',key,{'state':'completed','refundId':str(refund.id)})
            return {'status':'completed','httpStatus':200,'refundId':str(refund.id)}
        return {'status':'unknown','httpStatus':202}
    except ApiError: return {'status':'refused','httpStatus':422}
