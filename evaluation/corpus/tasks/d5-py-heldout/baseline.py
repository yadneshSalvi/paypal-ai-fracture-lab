from api import Context, Data
from paypal.core import ApiError
from paypal.models import OrderRequest, PurchaseUnitRequest, AmountWithBreakdown, OrderCaptureRequest

def handle(c: Context, x: Data) -> Data:
    plan=c.store.get('approved_plans',str(x['planId']))
    if plan is None or plan['accountId']!=x['accountId'] or not plan['approved']: return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    intent=c.store.get('intents',str(plan['intentId']))
    if intent is None: return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    try:
        if x['step']=='create':
            order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=str(plan['intentId']),amount=AmountWithBreakdown(currency_code=str(intent['currency']),value=f"{int(intent['amountMinor'])/100:.2f}"))]),pay_pal_request_id=c.request_id('plan-call',str(x['toolCallId'])),prefer='return=representation')
            return {'status':'ready','httpStatus':200,'orderId':str(order.id),'retryable':False}
        captured=c.client.orders.capture_order(str(x.get('orderId','missing')),body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('plan-capture',str(x['toolCallId'])),prefer='return=representation').to_dict(exclude_unset=True)
        captures=captured.get('purchase_units',[{}])[0].get('payments',{}).get('captures',[])
        if not captures: return {'status':'unknown','httpStatus':202,'code':'OUTCOME_UNKNOWN','retryable':True}
        capture_id=str(captures[0]['id'])
        if c.store.get('entitlements',str(plan['intentId'])) is None: c.store.insert('entitlements',str(plan['intentId']),{'captureId':capture_id})
        return {'status':'completed','httpStatus':200,'code':'CAPTURE_CONFIRMED','captureId':capture_id,'retryable':False}
    except ApiError: return {'status':'unknown','httpStatus':202,'code':'TOOL_ERROR','retryable':True}
