from api import Context, Data
from paypal.core import ApiError
from paypal.models import RefundRequest, Money

def handle(c: Context, x: Data) -> Data:
    permission=c.store.get('tool_permissions',str(x['permissionId']))
    if permission is None or permission['accountId']!=x['accountId'] or not permission['approved']: return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    try:
        refund=c.client.payments.refund_captured_payment(str(x['captureId']),body=RefundRequest(amount=Money(currency_code=str(permission['currency']),value=f"{int(x['amountMinor'])/100:.2f}"),custom_id=str(permission['refundIntentId'])),pay_pal_request_id=c.request_id('tool-refund',str(x['toolCallId'])),prefer='return=representation')
        return {'status':'completed','httpStatus':200,'code':'REFUND_CONFIRMED','retryable':False,'refundId':str(refund.id)}
    except ApiError: return {'status':'unknown','httpStatus':202,'code':'PROVIDER_ERROR','retryable':True}
