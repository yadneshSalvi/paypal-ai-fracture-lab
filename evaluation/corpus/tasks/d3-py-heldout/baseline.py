from api import Context, Data

def handle(c: Context, x: Data) -> Data:
    event=x['event']
    if not c.verify(event): return {'status':'invalid','httpStatus':401}
    binding=c.store.get('order_bindings',str(event['resource']['order_id']))
    if binding is None: return {'status':'ignored','httpStatus':200}
    key=str(binding['intentId'])
    intent=c.store.get('intents',key)
    if intent is None or intent['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    if event['event_type'] not in {'CHECKOUT.ORDER.APPROVED','PAYMENT.CAPTURE.COMPLETED'}: return {'status':'ignored','httpStatus':200}
    capture_id=str(event['resource'].get('capture_id',event['resource']['order_id']))
    if c.store.get('entitlements',key) is None: c.store.insert('entitlements',key,{'captureId':capture_id})
    if c.store.get('dispatches',str(event['id'])) is None: c.store.insert('dispatches',str(event['id']),{'captureId':capture_id})
    return {'status':'accepted','httpStatus':200}
