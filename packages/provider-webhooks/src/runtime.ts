import {createHash,createHmac} from 'node:crypto';
import pg from 'pg';
import {requiredConfig,sessionSecret} from '../../service/src/config';
import {DeliveryObserver,DeliveryStore} from './observer';
const state=globalThis as typeof globalThis&{fractureDeliveryObserver?:Promise<DeliveryObserver>};
export function getDeliveryObserver(){
 return state.fractureDeliveryObserver??=(async()=>{
  if(requiredConfig('PAYPAL_ENVIRONMENT')!=='sandbox'||requiredConfig('PAYPAL_API_BASE_URL')!=='https://api-m.sandbox.paypal.com'||requiredConfig('PAYPAL_PROJECT_ISOLATED')!=='true')throw Error('SANDBOX_ISOLATION_REQUIRED');
  const clientId=requiredConfig('PAYPAL_CLIENT_ID'),store=new DeliveryStore(new pg.Pool({connectionString:requiredConfig('DATABASE_URL'),max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:5000}),{scope:createHash('sha256').update(clientId).digest('hex'),webhookId:requiredConfig('PAYPAL_WEBHOOK_ID'),source:'live_sandbox',key:createHmac('sha256',sessionSecret()).update('fracture:webhook-evidence:v1').digest()});
  await store.initialize();return new DeliveryObserver(store,{environment:'sandbox',baseUrl:'https://api-m.sandbox.paypal.com',clientId,clientSecret:requiredConfig('PAYPAL_CLIENT_SECRET'),isolatedProject:'fracture-lab'});
 })().catch(error=>{delete state.fractureDeliveryObserver;throw error;});
}
