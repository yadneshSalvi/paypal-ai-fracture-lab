import {getDeliveryObserver} from '../../../../../../packages/provider-webhooks/src/runtime';
import {handleDelivery} from '../../../../../../packages/provider-webhooks/src/observer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
/** Provider signatures authenticate this route; judge cookies and browser Origin do not. */
export async function POST(request:Request){try{return await handleDelivery(request,await getDeliveryObserver());}catch{return Response.json({received:false},{status:503,headers:{'cache-control':'no-store'}});}}
