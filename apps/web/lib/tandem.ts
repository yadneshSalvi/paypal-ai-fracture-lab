import { getService } from '@fracture/service';
import { TandemExperiments } from '../../../packages/tandem/src/experiments';

let ready:Promise<TandemExperiments>|undefined;
export function getTandem(){return ready??=(async()=>{try{const service=await getService(),experiments=new TandemExperiments(service.store.db);await experiments.initialize();return experiments;}catch(error){ready=undefined;throw error;}})();}
