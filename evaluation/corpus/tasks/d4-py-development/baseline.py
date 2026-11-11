from api import Context, Data
from paypal.core import ApiError
from paypal.models import RefundRequest, Money

def handle(c: Context, x: Data) -> Data:
    key=str(x['refundIntentId'])
    auth=c.store.get('refund_authorizations',key)
    if auth is None: return {'status':'missing','httpStatus':404}
    if auth['accountId']!=x['accountId'] or not auth['approved']: return {'status':'forbidden','httpStatus':403}
    old=c.store.get('refund_results',key)
    if old is not None: return {'status':'completed','httpStatus':200,'refundId':old['refundId']}
    try:
        refund=c.client.payments.refund_captured_payment(str(auth['captureId']),body=RefundRequest(amount=Money(currency_code=str(auth['currency']),value=f"{int(auth['amountMinor'])/100:.2f}"),custom_id=key),pay_pal_request_id=c.request_id('refund-attempt',str(x['attemptId'])),prefer='return=representation')
        if refund.status=='COMPLETED' and isinstance(refund.id,str):
            c.store.insert('refund_results',key,{'refundId':refund.id,'captureId':auth['captureId'],'amountMinor':auth['amountMinor']})
            return {'status':'completed','httpStatus':200,'refundId':refund.id}
        return {'status':'unknown','httpStatus':202}
    except ApiError: return {'status':'refused','httpStatus':422}
