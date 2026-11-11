from api import Context, Data

def handle(c: Context, x: Data) -> Data:
    event=x['event']
    if not c.verify(event): return {'status':'invalid','httpStatus':401}
    if event['event_type']!='PAYMENT.CAPTURE.COMPLETED': return {'status':'ignored','httpStatus':200}
    binding=c.store.get('capture_bindings',str(event['resource']['id']))
    if binding is None: return {'status':'ignored','httpStatus':200}
    key=str(binding['intentId'])
    intent=c.store.get('intents',key)
    if intent is None or intent['accountId']!=x['accountId']: return {'status':'forbidden','httpStatus':403}
    if c.store.get('webhooks',str(event['id'])) is not None: return {'status':'accepted','httpStatus':200}
    c.store.insert('webhooks',str(event['id']),{'processed':True})
    if c.store.get('entitlements',key) is None: c.store.insert('entitlements',key,{'captureId':event['resource']['id'],'amountMinor':intent['amountMinor']})
    c.store.insert('notification_outbox',str(event['id']),{'captureId':event['resource']['id'],'kind':'purchase_receipt'})
    return {'status':'accepted','httpStatus':200}
