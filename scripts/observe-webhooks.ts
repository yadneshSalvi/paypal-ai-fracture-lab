import {mkdir,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {getDeliveryObserver} from '../packages/provider-webhooks/src/runtime';
const [command,...args]=process.argv.slice(2),observer=await getDeliveryObserver(),{store}=observer;
try{
 if(command==='list'){
  const deliveries=(await store.pool.query('SELECT id,source,event_type,body_hash,classification,received_at,verified_at,response_status,verification_trace FROM fracture_native_deliveries WHERE scope=$1 AND webhook_id=$2 ORDER BY received_at DESC LIMIT 100',[store.config.scope,store.config.webhookId])).rows;
  const counts=(await store.pool.query('SELECT event_type,count(*)::int AS canonical_events FROM fracture_native_events WHERE scope=$1 AND webhook_id=$2 GROUP BY event_type',[store.config.scope,store.config.webhookId])).rows;
  console.log(JSON.stringify({deliveries,counts,limit:100,financialOperations:0,targetFulfillmentEffects:0},null,2));
 }else if(command==='arm-single-500'){
  const [orderId,eventType,minutes='60']=args,duration=Number(minutes);if(!orderId||!eventType||!Number.isInteger(duration)||duration<1||duration>4320)throw Error('Usage: arm-single-500 exact-order-id exact-event-type window-minutes');
  const rule={id:randomUUID(),orderId,eventType,expiresAt:new Date(Date.now()+duration*60000).toISOString()};await store.armSingleFailure(rule);console.log(JSON.stringify({ruleId:rule.id,orderHash:createHash('sha256').update(orderId).digest('hex'),eventType,expiresAt:rule.expiresAt,maximumInjectedResponses:1,financialOperations:0}));
 }else if(command==='export-private'){
  const [attemptId]=args;if(!attemptId||!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Usage: export-private delivery-uuid');
  const evidence=await store.privateEvidence(attemptId);await mkdir('.artifacts/native-webhooks',{recursive:true,mode:0o700});const path=`.artifacts/native-webhooks/${attemptId}.json`;await writeFile(path,JSON.stringify(evidence,null,2)+'\n',{mode:0o600,flag:'wx'});console.log(JSON.stringify({savedPrivateFile:path}));
 }else throw Error('Commands: list | arm-single-500 | export-private');
}finally{await store.pool.end();}
