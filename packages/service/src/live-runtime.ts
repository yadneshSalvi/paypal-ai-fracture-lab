import type {SqlDatabase} from '@fracture/paypal-core';
import {LabError} from './errors';
import {LabStore} from './store';
import {LiveBramble} from './live-bramble';
import {LivePayPalGateway} from './live-provider';
import {requiredConfig} from './config';
const runners=new WeakMap<SqlDatabase,LiveBramble>();
export function liveBrambleEnabled(){return process.env.FRACTURE_LIVE_BRAMBLE==='1'&&process.env.PAYPAL_ENVIRONMENT==='sandbox'&&process.env.PAYPAL_API_BASE_URL==='https://api-m.sandbox.paypal.com';}
export function liveBramble(store:LabStore,readOnly=false){
 if(!readOnly&&!liveBrambleEnabled())throw new LabError('LIVE_RUNNER_DISABLED','The live sandbox runner has not been enabled on this deployment. Existing evidence remains available.',409);
 let runner=runners.get(store.db);if(!runner){runner=new LiveBramble(store,(_run,observer)=>new LivePayPalGateway({environment:'sandbox',baseUrl:requiredConfig('PAYPAL_API_BASE_URL'),clientId:requiredConfig('PAYPAL_CLIENT_ID'),clientSecret:requiredConfig('PAYPAL_CLIENT_SECRET'),isolatedProject:'fracture-lab'},observer));runners.set(store.db,runner);}return runner;
}
