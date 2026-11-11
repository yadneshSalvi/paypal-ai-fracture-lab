from api import Context, Data, StoreError
from paypal.core import ApiError, OAuthProviderError
from paypal.models import Order, OrderRequest, PurchaseUnitRequest, AmountWithBreakdown, OrderCaptureRequest
from decimal import Decimal
from pydantic import ValidationError
import httpx2

def unknown() -> Data: return {'status':'unknown','httpStatus':202,'code':'OUTCOME_UNKNOWN','retryable':False}

def finish(c: Context, plan_id: str, key: str, intent: Data, order: Order) -> Data:
    captures=[p for unit in order.to_dict(exclude_unset=True).get('purchase_units',[]) if unit.get('custom_id')==key for p in unit.get('payments',{}).get('captures',[])]
    paid=[p for p in captures if p.get('status')=='COMPLETED' and isinstance(p.get('id'),str) and p.get('amount',{}).get('currency_code')==intent['currency'] and Decimal(str(p.get('amount',{}).get('value','0')))*100==intent['amountMinor']]
    if not paid: return {'status':'pending','httpStatus':202,'code':'CAPTURE_PENDING','retryable':False} if any(p.get('status')=='PENDING' for p in captures) else unknown()
    capture_id=str(paid[0]['id'])
    try: c.store.insert('entitlements',key,{'captureId':capture_id,'amountMinor':intent['amountMinor']})
    except StoreError as error:
        if error.code!='SQLITE_CONSTRAINT_UNIQUE': raise
    c.store.patch('plan_receipts',plan_id,{'state':'completed','captureId':capture_id})
    return {'status':'completed','httpStatus':200,'code':'CAPTURE_CONFIRMED','captureId':capture_id,'retryable':False}

def recover(c: Context, plan_id: str, key: str, intent: Data, order_id: str) -> Data:
    try: order=c.client.orders.get_order(order_id)
    except (ApiError,httpx2.RequestError,ValidationError): return unknown()
    return finish(c,plan_id,key,intent,order)

def handle(c: Context, x: Data) -> Data:
    plan_id=str(x['planId'])
    plan=c.store.get('approved_plans',plan_id)
    intent=c.store.get('intents',str(plan['intentId'])) if plan is not None else None
    if plan is None or intent is None or plan['accountId']!=x['accountId'] or intent['accountId']!=x['accountId'] or not plan['approved'] or not intent['authorized'] or int(intent['amountMinor'])>int(plan['maximumMinor']) or x['step'] not in {'create','capture'}: return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    key=str(plan['intentId'])
    receipt=c.store.get('plan_receipts',plan_id)
    if x['step']=='create':
        if receipt is not None and receipt.get('orderId'): return {'status':'ready','httpStatus':200,'orderId':receipt['orderId'],'retryable':False}
        if receipt is not None and receipt['state']!='not_sent': return unknown()
        try:
            if receipt is None: c.store.insert('plan_receipts',plan_id,{'state':'unknown','requestId':c.request_id('atlas-plan',plan_id,'create')})
            else: c.store.patch('plan_receipts',plan_id,{'state':'unknown'},int(receipt['version']))
        except StoreError as error:
            if error.code not in {'SQLITE_CONSTRAINT_UNIQUE','VERSION_CONFLICT'}: raise
            return unknown()
        try: order=c.client.orders.create_order(OrderRequest(intent='CAPTURE',purchase_units=[PurchaseUnitRequest(custom_id=key,amount=AmountWithBreakdown(currency_code=str(intent['currency']),value=f"{int(intent['amountMinor'])//100}.{int(intent['amountMinor'])%100:02d}"))]),pay_pal_request_id=c.request_id('atlas-plan',plan_id,'create'),prefer='return=representation')
        except ApiError as error:
            if isinstance(error.error,OAuthProviderError):
                c.store.patch('plan_receipts',plan_id,{'state':'not_sent'})
                return {'status':'not_sent','httpStatus':503,'code':'AUTHENTICATION_UNAVAILABLE','retryable':True}
            return {'status':'refused','httpStatus':422,'retryable':False} if 400<=error.status_code<500 and error.status_code!=408 else unknown()
        except (httpx2.RequestError,ValidationError): return unknown()
        if not isinstance(order.id,str): return unknown()
        units=order.to_dict(exclude_unset=True).get('purchase_units',[])
        if not any(p.get('custom_id')==key and p.get('amount',{}).get('currency_code')==intent['currency'] and Decimal(str(p.get('amount',{}).get('value','0')))*100==intent['amountMinor'] for p in units): return unknown()
        c.store.patch('plan_receipts',plan_id,{'state':'ready','orderId':order.id})
        return {'status':'ready','httpStatus':200,'orderId':order.id,'retryable':False}
    if receipt is None or not receipt.get('orderId'): return {'status':'out_of_order','httpStatus':409,'code':'CREATE_REQUIRED','retryable':False}
    if x.get('orderId')!=receipt['orderId']: return {'status':'denied','httpStatus':403,'code':'POLICY_DENIED','retryable':False}
    order_id=str(receipt['orderId'])
    old=c.store.get('plan_captures',plan_id)
    if old is not None and old['state']!='not_sent': return recover(c,plan_id,key,intent,order_id)
    try:
        if old is None: c.store.insert('plan_captures',plan_id,{'state':'unknown','orderId':order_id,'requestId':c.request_id('atlas-plan',plan_id,'capture')})
        else: c.store.patch('plan_captures',plan_id,{'state':'unknown'},int(old['version']))
    except StoreError as error:
        if error.code not in {'SQLITE_CONSTRAINT_UNIQUE','VERSION_CONFLICT'}: raise
        return recover(c,plan_id,key,intent,order_id)
    try: after=c.client.orders.capture_order(order_id,body=OrderCaptureRequest(),pay_pal_request_id=c.request_id('atlas-plan',plan_id,'capture'),prefer='return=representation')
    except ApiError as error:
        if isinstance(error.error,OAuthProviderError):
            c.store.patch('plan_captures',plan_id,{'state':'not_sent'})
            return {'status':'not_sent','httpStatus':503,'code':'AUTHENTICATION_UNAVAILABLE','retryable':True}
        if 400<=error.status_code<500 and error.status_code!=408: return {'status':'refused','httpStatus':422,'retryable':False}
        return recover(c,plan_id,key,intent,order_id)
    except (httpx2.RequestError,ValidationError): return recover(c,plan_id,key,intent,order_id)
    result=finish(c,plan_id,key,intent,after)
    return recover(c,plan_id,key,intent,order_id) if result['status']=='unknown' else result
