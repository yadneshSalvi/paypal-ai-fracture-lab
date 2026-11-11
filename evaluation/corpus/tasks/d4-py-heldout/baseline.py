from api import Context, Data
from paypal.core import ApiError
from paypal.models import RefundRequest, Money

def handle(c: Context, x: Data) -> Data:
    batch=c.store.get('refund_batches',str(x['batchId']))
    if batch is None: return {'status':'missing','httpStatus':404}
    if batch['accountId']!=x['accountId'] or not batch['approved']: return {'status':'forbidden','httpStatus':403}
    results: list[Data]=[]
    try:
        for item in batch['items']:
            refund=c.client.payments.refund_captured_payment(str(item['captureId']),body=RefundRequest(amount=Money(currency_code=str(item['currency']),value=f"{int(item['amountMinor'])/100:.2f}"),custom_id=str(item['refundIntentId'])),pay_pal_request_id=c.request_id('batch-attempt',str(x['deliveryId'])),prefer='return=representation')
            if refund.status!='COMPLETED' or not isinstance(refund.id,str): return {'status':'unknown','httpStatus':202,'items':results}
            key=str(item['refundIntentId'])
            if c.store.get('batch_refunds',key) is None: c.store.insert('batch_refunds',key,{'batchId':x['batchId'],'refundId':refund.id,'amountMinor':item['amountMinor']})
            results.append({'refundIntentId':key,'status':'completed','refundId':refund.id})
        return {'status':'completed','httpStatus':200,'items':results}
    except ApiError: return {'status':'refused','httpStatus':422,'items':results}
