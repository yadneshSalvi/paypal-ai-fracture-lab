import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PaymentCore,SqlPaymentStore,ProviderError,canonicalJson,payloadHash,sha256,toProviderMoney} from '@fracture/paypal-core';
import type {PaymentAction,PaymentCommand,PaymentOperation,ProviderResource,SqlConnection} from '@fracture/paypal-core';
import type {RunDTO} from '@fracture/contracts';
import {LabStore} from './store';
import {LabError} from './errors';
import {newRun,refreshRun} from './executor';
import {projectCatalog} from './catalog';
import {scenarios} from '../../scenarios/src/index';
import type {FixtureResource,RunInput} from './types';
import {LivePayPalGateway} from './live-provider';
import type {LiveObservation,LiveObserver} from './live-provider';
import {artifactPath} from './config';

export type LiveAttemptStage='creating'|'approval_required'|'capturing'|'response_lost'|'completed'|'unknown'|'refused';
export interface LiveAttempt {attempt:number;stage:LiveAttemptStage;orderId:string|null;createId:string;captureId:string;createdAt:string;captureAt:string|null;error:string|null;approvalOrigin?:string}
export interface LiveRefund {command:PaymentCommand;status:PaymentOperation['status'];refundId:string|null}
type AttemptRow={document:string;lease_until:string|null}&Record<string,unknown>;
export type LiveGatewayFactory=(run:RunDTO,observer:LiveObserver)=>LivePayPalGateway;
const money={currency:'USD',minor:1200};
export function liveApprovalOrigins(){return [...new Set(['http://localhost:4104','http://127.0.0.1:4104',process.env.APP_URL,process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:null].filter((x):x is string=>Boolean(x)).map(x=>new URL(x).origin))];}
function approvalOrigin(value:string){const url=new URL(value);if(url.username||url.password||url.hash||url.pathname!=='/'||url.search||!liveApprovalOrigins().includes(url.origin))throw new LabError('RETURN_ORIGIN','This checkout return origin is not configured for the application.',400);return url.origin;}
const authorityExpiry=(run:RunDTO)=>new Date(Date.parse(run.createdAt)+3600000).toISOString();

/** Browser-continuable phases. Each network step is claimed durably before dispatch. */
export class LiveBramble {
 private gateways=new Map<string,LivePayPalGateway>();
 constructor(readonly store:LabStore,private readonly factory:LiveGatewayFactory){}
 private async fingerprint(revision:RunDTO['revision']){
  const files=['packages/service/src/live-bramble.ts','packages/service/src/live-provider.ts'];
  return sha256(canonicalJson({revision,protocol:'browser-bramble-v1',files:await Promise.all(files.map(async path=>({path,hash:sha256(await readFile(artifactPath(path),'utf8'))})))}));
 }
 async authority(sessionId:string,runId:string,tx:SqlConnection=this.store.db){
  const row=await this.store.record(runId,sessionId,tx);const run=JSON.parse(row.document) as RunDTO;
  const session=await tx.query<{expires_at:string}&Record<string,unknown>>('SELECT expires_at FROM lab_sessions WHERE id=$1',[sessionId]);
  if(run.source!=='live_sandbox'||run.projectId!=='bramble'||!['L1','L2'].includes(run.scenarioId))throw new LabError('LIVE_SCOPE','This is not an admitted browser-approved Bramble run.',409);
  if(row.cancelled||!session.rows[0]||session.rows[0].expires_at<=new Date().toISOString()||authorityExpiry(run)<=new Date().toISOString())throw new LabError('LIVE_AUTHORITY_EXPIRED','This experiment cannot dispatch another payment action. Original evidence remains available.',403);
  if(run.amountMinor!==1200||run.currency!=='USD')throw new LabError('LIVE_AMOUNT_CHANGED','The frozen experiment amount changed.',409);
  if(run.sourceHash!==await this.fingerprint(run.revision))throw new LabError('LIVE_SOURCE_CHANGED','The experiment implementation changed. Retain this run and prepare a new version before another write.',409);
  return run;
 }
 async attempts(runId:string,tx:SqlConnection=this.store.db):Promise<LiveAttempt[]>{const result=await tx.query<AttemptRow>('SELECT document,lease_until FROM lab_live_attempts WHERE run_id=$1 ORDER BY attempt',[runId]);return result.rows.map(r=>JSON.parse(r.document) as LiveAttempt);}
 private async refund(runId:string,tx:SqlConnection=this.store.db){const row=await tx.query<{document:string}&Record<string,unknown>>('SELECT document FROM lab_live_refunds WHERE run_id=$1',[runId]);return row.rows[0]?JSON.parse(row.rows[0].document) as LiveRefund:null;}
 async view(sessionId:string,runId:string){const run=await this.store.run(runId,sessionId);if(run.source!=='live_sandbox'||run.projectId!=='bramble'||!['L1','L2'].includes(run.scenarioId))throw new LabError('LIVE_SCOPE','Select a live Bramble sandbox run.',409);const refund=await this.refund(runId);return {run,attempts:await this.attempts(runId),authorityExpiresAt:authorityExpiry(run),compensation:refund?{status:refund.status,captureId:refund.command.action.kind==='refund_capture'?refund.command.action.captureId:null,refundId:refund.refundId,expiresAt:refund.command.approval.expiresAt}:null};}
 async start(sessionId:string,input:Pick<RunInput,'requestId'|'seed'|'revision'|'scenarioId'>){
  if(!['L1','L2'].includes(input.scenarioId))throw new LabError('LIVE_GATE','This runner admits only L1 and L2. Other live cases retain their separate gates.',409);
  const project=(await projectCatalog([])).find(p=>p.id==='bramble')!;const scenario=scenarios.find(s=>s.id===input.scenarioId)!;
  const full:RunInput={...input,projectId:'bramble',mode:'live_sandbox',interactive:true};
  const fresh=newRun(full,scenario,project);fresh.stage='awaiting_approval';fresh.summary='One twelve-dollar purchase. Each original order needs its own real PayPal sandbox approval.';fresh.nextAction='Approve the original purchase';fresh.limitations=['Live PayPal sandbox resources with a controlled response-only fault. No real money.','Browser-continuable target phases are versioned separately from the Sample checkout.','The intentionally faulty target sends raw HTTP without a provider request ID. The hardened target uses the pinned APIMatic SDK.'];
  fresh.sourceHash=await this.fingerprint(input.revision);
  const created=await this.store.createRun(sessionId,full,fresh);await this.store.db.query("UPDATE lab_jobs SET stage='waiting' WHERE run_id=$1 AND stage='queued'",[created.run.id]);return this.view(sessionId,created.run.id);
 }
 private async save(runId:string,attempt:LiveAttempt,tx:SqlConnection=this.store.db){await tx.query('UPDATE lab_live_attempts SET stage=$3,document=$4,capture_at=$5,lease_until=NULL WHERE run_id=$1 AND attempt=$2',[runId,attempt.attempt,attempt.stage,JSON.stringify(attempt),attempt.captureAt]);}
 private async observe(runId:string,value:LiveObservation){
  const run=await this.store.run(runId);await this.store.db.transaction(async tx=>{
   await tx.query('SELECT id FROM lab_runs WHERE id=$1 FOR UPDATE',[runId]);const prior=await this.store.resources(runId,tx);
   for(const r of value.resources){const old=prior.find(x=>x.id===r.id);const m=r.money??old?.money??null;const resource:FixtureResource={...r,parentId:r.parentId??old?.parentId??null,money:m,customId:r.customId??old?.customId??null,intentId:run.businessIntentId,approved:r.kind==='order'?['APPROVED','COMPLETED'].includes(r.status):old?.approved??true,createdAt:old?.createdAt??r.observedAt,capturedMinor:r.kind==='capture'&&r.status==='COMPLETED'?(m?.minor??0):old?.capturedMinor??0,refundedMinor:old?.refundedMinor??0,providerRequestId:value.requestId,wireAmount:{currency_code:m?.currency??run.currency,value:m?toProviderMoney(m).value:'0.00'}};
    await tx.query('INSERT INTO lab_provider_resources(run_id,id,kind,parent_id,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT(run_id,id) DO UPDATE SET document=$5',[runId,r.id,r.kind,resource.parentId,JSON.stringify(resource)]);
   }
  });
  const effect=value.resources.find(r=>r.kind==='capture')??value.resources[0];
  await this.store.emit(runId,{lane:'provider',kind:value.method==='GET'?'resource_read':effect?`${effect.kind}_${effect.status.toLowerCase()}`:'provider_response',title:value.method==='GET'?'Read the original PayPal resource':effect?`PayPal recorded ${effect.kind} ${effect.status.toLowerCase()}`:'PayPal returned a refusal',detail:'An actual sandbox response was reduced to payment resources. Payer details and credentials are excluded.',identity:value.requestId?'stable':'absent',...(effect?{resourceId:effect.id}:{}),...(value.requestId?{requestId:value.requestId}:{}),facts:{...value,source:'live_sandbox'}});
 }
 private gateway(run:RunDTO,sessionId:string){
  let gateway=this.gateways.get(run.id);if(!gateway){gateway=this.factory(run,{authorizeWrite:async()=>{await this.authority(sessionId,run.id);},observe:v=>this.observe(run.id,v),dropCaptureResponse:async()=>{
   const used=await this.store.db.query('INSERT INTO lab_faults(run_id,fault_key,document) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[run.id,'live-lost-capture-answer',JSON.stringify({source:'local_proxy',at:new Date().toISOString()})]);if(!used.rowCount)return false;
   await this.store.emit(run.id,{lane:'lab',kind:'response_dropped',title:'The payment arrived. Its answer did not.',detail:'The real upstream capture response was observed before the target received a controlled connection interruption.',facts:{upstreamPersisted:true,targetReceived:false,faultSource:'local_proxy'}});
   if(run.revision==='hardened'){const target=await this.store.targetState(run.id,run.businessIntentId);target.status='checking';target.unknown=true;await this.store.setTargetState(run.id,target);await this.store.emit(run.id,{lane:'application',kind:'checking_unknown',title:'Checking your payment…',detail:'The target retains the original intent and reads the original resource before another write.',identity:'stable'});}
   return true;
  }});this.gateways.set(run.id,gateway);}return gateway;
 }
 private command(run:RunDTO,sessionId:string,attempt:LiveAttempt,action:PaymentAction):PaymentCommand{
  const key=action.kind==='create_order'?'create':'capture';const operationId=sha256(`live-bramble:${run.id}:${key}`).slice(0,32);return {scope:{tenantId:sessionId,projectId:run.id},operationId,businessKey:`${key}:${run.businessIntentId}`,intentId:run.businessIntentId,providerRequestId:key==='create'?attempt.createId:attempt.captureId,payloadHash:payloadHash(action),action,approval:{id:`live-browser:${run.id}`,version:1,digest:sha256(`${run.businessIntentId}:USD:1200`),expiresAt:authorityExpiry(run)}};
 }
 private core(run:RunDTO,sessionId:string,gateway:LivePayPalGateway){return new PaymentCore({store:new SqlPaymentStore(this.store.db),provider:gateway.provider,policy:{authorize:async()=>{await this.authority(sessionId,run.id);const resources=await this.store.resources(run.id);return {allowed:true,reason:'Current isolated experiment; payer approval is separately verified by PayPal.',resourceIds:resources.map(r=>r.id),currency:'USD',maximumMinor:1200,checkoutOrigins:liveApprovalOrigins(),approvalId:`live-browser:${run.id}`,approvalVersion:1,approvalDigest:sha256(`${run.businessIntentId}:USD:1200`)};}}});}
 private async capacity(tx:SqlConnection){await tx.query("SELECT id FROM lab_locks WHERE id='worker-capacity' FOR UPDATE");const active=await tx.query("SELECT run_id FROM lab_live_attempts WHERE stage IN ('creating','capturing') AND lease_until>$1",[new Date().toISOString()]);if(active.rowCount>=3)throw new LabError('LIVE_CAPACITY','Three live provider steps are already running. Try again shortly.',429);}
 private async finishCapture(sessionId:string,run:RunDTO,attempt:LiveAttempt,capture:ProviderResource){
  if(capture.status!=='COMPLETED'||capture.money?.currency!=='USD'||capture.money.minor!==1200)throw new LabError('CAPTURE_NOT_CONFIRMED','Only an exact completed twelve-dollar capture can release the book.',409);
  const result=await this.store.db.transaction(async tx=>{
   await tx.query('SELECT id FROM lab_runs WHERE id=$1 FOR UPDATE',[run.id]);
   const row=await this.store.record(run.id,sessionId,tx);let permitted=true;
   try{await this.authority(sessionId,run.id,tx);}catch(error){if(!(error instanceof LabError))throw error;permitted=false;}
   const state=await this.store.targetState(run.id,run.businessIntentId,tx);state.status='paid';state.lastCaptureId=capture.id;state.unknown=false;attempt.stage='completed';
   let inserted=false;
   if(permitted){const id=randomUUID();const saved=await tx.query('INSERT INTO lab_fulfillments(id,run_id,intent_id,capture_id,entitlement_key,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(run_id,entitlement_key) DO NOTHING',[id,run.id,run.businessIntentId,capture.id,run.revision==='hardened'?run.businessIntentId:`attempt:${attempt.attempt}`,JSON.stringify({source:'live_sandbox',kind:'digital_book',captureId:capture.id})]);inserted=saved.rowCount>0;}
   await this.store.setTargetState(run.id,state,tx);await this.save(run.id,attempt,tx);return {permitted,inserted,cancelled:Boolean(row.cancelled)};
  });
  if(result.inserted)await this.store.emit(run.id,{lane:'application',kind:'fulfilled',title:'The purchase has a download',detail:'The target issued a book entitlement after its capture handling.',resourceId:capture.id,identity:run.revision==='hardened'?'stable':'absent'});
  if(!result.permitted)await this.store.emit(run.id,{lane:'lab',kind:'authority_ended_after_capture',title:'The already-sent payment is retained',detail:'Current authority no longer permits fulfillment. The original completed payment remains visible.',resourceId:capture.id});
  return result;
 }
 /** Reconcile a saved original resource; this method cannot send a payment write. */
 async reconcile(sessionId:string,runId:string){
  const run=(await this.view(sessionId,runId)).run;const attempts=await this.attempts(runId);const attempt=attempts.at(-1);
  if(!attempt?.orderId)return this.view(sessionId,runId);
  const rows=await this.store.db.query<AttemptRow>('SELECT document,lease_until FROM lab_live_attempts WHERE run_id=$1 AND attempt=$2',[runId,attempt.attempt]);
  if(rows.rows[0]?.lease_until&&rows.rows[0].lease_until>new Date().toISOString())return this.view(sessionId,runId);
  const gateway=this.gateway(run,sessionId);
  await gateway.provider.read('order',attempt.orderId,AbortSignal.timeout(20000));
  const refund=await this.refund(runId);if(refund){const core=this.compensationCore(run,sessionId,refund.command);const original=await new SqlPaymentStore(this.store.db).get(refund.command.scope,refund.command.operationId);if(original)await this.saveRefund(runId,await core.reconcile(refund.command.scope,refund.command.operationId,AbortSignal.timeout(20000)));}
  if(run.revision==='hardened'&&attempt.captureAt&&['capturing','unknown'].includes(attempt.stage)){
   const command=this.command(run,sessionId,attempt,{kind:'capture_order',money,orderId:attempt.orderId});
   const recorded=await new SqlPaymentStore(this.store.db).get(command.scope,command.operationId);
   if(recorded){const operation=await this.core(run,sessionId,gateway).reconcile(command.scope,command.operationId,AbortSignal.timeout(20000));const capture=operation.status==='succeeded'?operation.receipt?.resources.find(r=>r.kind==='capture'&&r.status==='COMPLETED'):undefined;if(capture)await this.finishCapture(sessionId,run,attempt,capture);}
  }
  await this.store.emit(runId,{lane:'lab',kind:'recovery_read',title:'Read the saved original purchase',detail:run.revision==='faulty'?'This lab observation does not change the faulty target’s knowledge or create a replacement purchase.':'Only the original operation was reconciled. No payment write was retried.',facts:{readOnly:true,orderId:attempt.orderId}});
  const current=await refreshRun(this.store,runId,false);const cancelled=Boolean((await this.store.record(runId,sessionId)).cancelled);
  if(cancelled)await this.store.updateRun(runId,r=>({...r,stage:current.phoneState==='checking'?'cancelled_uncertain':'cancelled_reconciled',nextAction:'Inspect retained evidence'}));
  else if(attempt.stage==='completed')await refreshRun(this.store,runId,true);
  return this.view(sessionId,runId);
 }
 private async compensationAuthority(run:RunDTO,sessionId:string,command:PaymentCommand){
  await this.store.record(run.id,sessionId);const rows=await this.store.db.query<{expires_at:string}&Record<string,unknown>>('SELECT expires_at FROM lab_sessions WHERE id=$1',[sessionId]);const recorded=await this.refund(run.id);
  if(!rows.rows[0]||rows.rows[0].expires_at<=new Date().toISOString()||command.approval.expiresAt<=new Date().toISOString()||!recorded||canonicalJson(recorded.command)!==canonicalJson(command))throw new LabError('REFUND_AUTHORITY_EXPIRED','The exact duplicate-refund approval is unavailable or expired. Its original operation can still be read.',403);
 }
 private compensationCore(run:RunDTO,sessionId:string,command:PaymentCommand){
  const gateway=this.factory(run,{authorizeWrite:()=>this.compensationAuthority(run,sessionId,command),observe:value=>this.observe(run.id,value),dropCaptureResponse:async()=>false});
  return new PaymentCore({store:new SqlPaymentStore(this.store.db),provider:gateway.provider,policy:{authorize:async()=>{
   await this.compensationAuthority(run,sessionId,command);const action=command.action;if(action.kind!=='refund_capture')throw new LabError('REFUND_SCOPE','Only the approved duplicate capture can be refunded.',409);
   const captures=await gateway.provider.read('capture',action.captureId,AbortSignal.timeout(20000));const capture=captures.find(c=>c.kind==='capture'&&c.id===action.captureId);if(capture?.status!=='COMPLETED'||capture.money?.currency!=='USD'||capture.money.minor!==1200)throw new LabError('REFUND_RESOURCE_CHANGED','The duplicate capture no longer has its original complete unrefunded amount. Read the original operation.',409);
   return {allowed:true,reason:'Separate explicit approval for the exact extra sandbox capture.',resourceIds:[action.captureId,...(action.orderId?[action.orderId]:[])],currency:'USD',maximumMinor:1200,approvalId:command.approval.id,approvalVersion:command.approval.version,approvalDigest:command.approval.digest,reservation:{resourceKey:`capture:${action.captureId}`,currency:'USD',totalMinor:1200,externallyConsumedMinor:0,observedProviderIds:[],observedAt:capture.observedAt}};
  }}});
 }
 private async saveRefund(runId:string,operation:PaymentOperation){
  const effect=operation.receipt?.resources.find(r=>r.kind==='refund');const value:LiveRefund={command:operation.command,status:operation.status,refundId:effect?.id??null};await this.store.db.query('UPDATE lab_live_refunds SET document=$2 WHERE run_id=$1',[runId,JSON.stringify(value)]);
  if(operation.status==='succeeded')await this.store.updateRun(runId,r=>({...r,remediation:'completed'}));
 }
 /** Separate compensation never changes the original duplicate-charge verdict or gross history. */
 async compensate(sessionId:string,runId:string,captureId:string){
  const run=(await this.view(sessionId,runId)).run;const completed=run.captures.filter(c=>['COMPLETED','PARTIALLY_REFUNDED','REFUNDED'].includes(c.status));
  if(run.revision!=='faulty'||run.scenarioId!=='L2'||completed.length!==2||completed[1]?.id!==captureId)throw new LabError('REFUND_SCOPE','Select the exact extra capture from this two-charge baseline.',409);
  const claim=await this.store.db.transaction(async tx=>{
   await tx.query('SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE',[runId,sessionId]);const old=await this.refund(runId,tx);if(old)return {value:old,won:false};
   const action:PaymentAction={kind:'refund_capture',money,captureId,orderId:completed[1]!.orderId};const operationId=sha256(`live-bramble:${runId}:duplicate-refund`).slice(0,32);const now=new Date().toISOString();const command:PaymentCommand={scope:{tenantId:sessionId,projectId:runId},operationId,businessKey:`duplicate-refund:${run.businessIntentId}`,intentId:run.businessIntentId,providerRequestId:randomUUID(),payloadHash:payloadHash(action),action,approval:{id:`duplicate-refund:${runId}`,version:1,digest:sha256(canonicalJson(action)),expiresAt:new Date(Date.now()+3600000).toISOString()}};const value:LiveRefund={command,status:'claimed',refundId:null};
   await tx.query('INSERT INTO lab_live_refunds(run_id,session_id,capture_id,created_at,document) VALUES($1,$2,$3,$4,$5)',[runId,sessionId,captureId,now,JSON.stringify(value)]);return {value,won:true};
  });
  const core=this.compensationCore(run,sessionId,claim.value.command);
  if(claim.won){await this.store.emit(runId,{lane:'lab',kind:'live_compensation_approved',title:'Approve the separate duplicate refund',detail:'The operator approved one twelve-dollar sandbox refund against this exact extra capture. Both original charges remain in the experiment history.',resourceId:captureId,facts:{amountMinor:1200,currency:'USD',separateAuthority:true}});await this.saveRefund(runId,await core.execute(claim.value.command,AbortSignal.timeout(25000)));}
  else{const original=await new SqlPaymentStore(this.store.db).get(claim.value.command.scope,claim.value.command.operationId);if(original)await this.saveRefund(runId,await core.reconcile(claim.value.command.scope,claim.value.command.operationId,AbortSignal.timeout(20000)));}
  await refreshRun(this.store,runId,false);return this.view(sessionId,runId);
 }
 async createOrder(sessionId:string,runId:string,expectedAttempt:1|2,origin=process.env.APP_URL??'http://localhost:4104'){
  const returnOrigin=approvalOrigin(origin);
  const claim=await this.store.db.transaction(async tx=>{
   await this.capacity(tx);await tx.query('SELECT id FROM lab_runs WHERE id=$1 AND session_id=$2 FOR UPDATE',[runId,sessionId]);const run=await this.authority(sessionId,runId,tx);const attempts=await this.attempts(runId,tx);const last=attempts.at(-1);
   const existing=attempts.find(a=>a.attempt===expectedAttempt);if(existing)return {run,attempt:existing,won:false};
   if(expectedAttempt!==attempts.length+1||last&&!(run.scenarioId==='L2'&&run.revision==='faulty'&&last.attempt===1&&last.stage==='response_lost'))throw new LabError('RETRY_NOT_READY','A new purchase requires the explicit retry step after the first confirmed lost answer.',409);
   if(attempts.length>=2||run.revision==='hardened'&&attempts.length)throw new LabError('NO_NEW_PURCHASE','This intent cannot create another purchase.',409);
   const now=new Date().toISOString();const attempt:LiveAttempt={attempt:attempts.length+1,stage:'creating',orderId:null,createId:randomUUID(),captureId:randomUUID(),createdAt:now,captureAt:null,error:null,approvalOrigin:returnOrigin};
   await tx.query('INSERT INTO lab_live_attempts(run_id,session_id,attempt,stage,created_at,capture_at,lease_until,document) VALUES($1,$2,$3,$4,$5,NULL,$6,$7)',[runId,sessionId,attempt.attempt,attempt.stage,now,new Date(Date.now()+90000).toISOString(),JSON.stringify(attempt)]);return {run,attempt,won:true};
  });
  if(!claim.won)return this.view(sessionId,runId);const {run,attempt}=claim;const gateway=this.gateway(run,sessionId);
  await this.store.emit(runId,{lane:attempt.attempt===2?'customer':'application',kind:attempt.attempt===2?'customer_retry':'checkout_started',title:attempt.attempt===2?'Maya retries the same purchase':'The original purchase begins',detail:attempt.attempt===2?'The faulty target creates a second order for the same intent. This distinct order still needs its own PayPal approval.':'The lab has not approved or captured a payment.',identity:run.revision==='faulty'?'absent':'stable',facts:{attempt:attempt.attempt,scriptedApproval:false}});
  try{
   let resources:ProviderResource[]=[];
   const experience={returnUrl:`${attempt.approvalOrigin}/live-bramble?runId=${runId}&paypalReturn=1`,cancelUrl:`${attempt.approvalOrigin}/live-bramble?runId=${runId}&paypalCancel=1`,userAction:'PAY_NOW' as const,shippingPreference:'NO_SHIPPING' as const,brandName:'Bramble Books sandbox'};
   if(run.revision==='faulty')resources=await gateway.raw('/v2/checkout/orders',{intent:'CAPTURE',purchase_units:[{amount:{currency_code:'USD',value:'12.00'},custom_id:run.businessIntentId}],payment_source:{paypal:{experience_context:{return_url:experience.returnUrl,cancel_url:experience.cancelUrl,user_action:experience.userAction,shipping_preference:experience.shippingPreference,brand_name:experience.brandName}}}});
   else{const result=await this.core(run,sessionId,gateway).execute(this.command(run,sessionId,attempt,{kind:'create_order',money,intent:'CAPTURE',customId:run.businessIntentId,experience}));resources=result.receipt?.resources??[];if(result.status!=='succeeded')throw new ProviderError('api','The original create outcome needs review.',result.status==='refused'||result.status==='not_sent'?'not_sent':'unknown',202);}
   const order=resources.find(r=>r.kind==='order');if(!order)throw new ProviderError('decode','No original order ID was returned.','unknown',502);
   attempt.orderId=order.id;attempt.stage='approval_required';await this.save(runId,attempt);const state=await this.store.targetState(runId,run.businessIntentId);state.attempt=attempt.attempt;state.orderIds.push(order.id);state.status='unpaid';await this.store.setTargetState(runId,state);await refreshRun(this.store,runId,false);
  }catch(error){attempt.stage=error instanceof ProviderError&&error.outcome!=='unknown'?'refused':'unknown';attempt.error=attempt.stage==='unknown'?'CREATE_OUTCOME_UNKNOWN':'CREATE_NOT_SENT_OR_REFUSED';await this.save(runId,attempt);await this.store.updateRun(runId,r=>({...r,stage:'inconclusive',verdict:'inconclusive',summary:'The original order outcome needs review. No second create is attempted.',nextAction:'Inspect the retained evidence'}));}
  return this.view(sessionId,runId);
 }
 async approvalLink(sessionId:string,runId:string,expectedAttempt:1|2,origin:string){
  const view=await this.createOrder(sessionId,runId,expectedAttempt,origin);const attempt=view.attempts.find(a=>a.attempt===expectedAttempt);if(!attempt?.orderId||attempt.stage!=='approval_required')throw new LabError('APPROVAL_NOT_READY','The saved order is not awaiting approval. Read its original resources.',409);const url=await this.gateway(view.run,sessionId).approvalUrl(attempt.orderId);return {view,url};
 }
 async capture(sessionId:string,runId:string,orderId:string){
  const run=await this.authority(sessionId,runId);const previous=(await this.attempts(runId)).at(-1);if(!previous||previous.orderId!==orderId)throw new LabError('ORDER_SCOPE','This order is not the current purchase in your experiment.',403);
  if(previous.stage!=='approval_required')return this.view(sessionId,runId);
  const gateway=this.gateway(run,sessionId);await gateway.approvedOrder(orderId,run.businessIntentId);
  const claim=await this.store.db.transaction(async tx=>{
   await this.capacity(tx);await tx.query('SELECT id FROM lab_sessions WHERE id=$1 FOR UPDATE',[sessionId]);await tx.query('SELECT id FROM lab_runs WHERE id=$1 FOR UPDATE',[runId]);await this.authority(sessionId,runId,tx);const attempt=(await this.attempts(runId,tx)).at(-1)!;if(attempt.orderId!==orderId)throw new LabError('ORDER_SCOPE','The active purchase changed.',409);if(attempt.stage!=='approval_required')return null;
   const since=new Date(Date.now()-3600000).toISOString();const reserved=await tx.query('SELECT run_id FROM lab_live_attempts WHERE session_id=$1 AND capture_at>$2',[sessionId,since]);if(reserved.rowCount>=6)throw new LabError('LIVE_SPEND_LIMIT','This session has used its six capture slots and $72 gross ceiling for this rolling hour. Unknown outcomes still count.',429);
   attempt.stage='capturing';attempt.captureAt=new Date().toISOString();await tx.query('UPDATE lab_live_attempts SET stage=$3,capture_at=$4,lease_until=$5,document=$6 WHERE run_id=$1 AND attempt=$2',[runId,attempt.attempt,attempt.stage,attempt.captureAt,new Date(Date.now()+90000).toISOString(),JSON.stringify(attempt)]);return attempt;
  });
  if(!claim)return this.view(sessionId,runId);const attempt=claim;
  await this.store.emit(runId,{lane:'customer',kind:'buyer_approved',title:'PayPal confirms approval for this order',detail:'A fresh provider read confirms the original order, purchase intent and exact twelve-dollar amount.',resourceId:orderId,facts:{approvalSource:'PayPal order GET',attempt:attempt.attempt}});
  let targetCapture:ProviderResource|undefined;let unknown=false;
  try{
   if(run.revision==='faulty'){targetCapture=(await gateway.raw(`/v2/checkout/orders/${orderId}/capture`,{})).find(r=>r.kind==='capture'&&r.status==='COMPLETED');if(!targetCapture)throw new TypeError('The target received no completed capture resource in a nominal success.');}
   else{await this.store.emit(runId,{lane:'application',kind:'checkout_claimed',title:'Keep one durable purchase identity',detail:'The hardened target records the capture command before dispatch and reconciles an unknown answer.',identity:'stable'});const result=await this.core(run,sessionId,gateway).execute(this.command(run,sessionId,attempt,{kind:'capture_order',money,orderId}));targetCapture=result.status==='succeeded'?result.receipt?.resources.find(r=>r.kind==='capture'&&r.status==='COMPLETED'):undefined;unknown=result.status==='pending_reconciliation';}
  }catch(error){unknown=!(error instanceof ProviderError)||error.outcome==='unknown';attempt.error=unknown?'CAPTURE_OUTCOME_UNKNOWN':'CAPTURE_REFUSED';}
  const resources=await this.store.resources(runId);const observed=resources.find(r=>r.kind==='capture'&&r.parentId===orderId&&r.status==='COMPLETED');const state=await this.store.targetState(runId,run.businessIntentId);
  if(targetCapture)await this.finishCapture(sessionId,run,attempt,targetCapture);
  else{state.status=run.revision==='faulty'?'failed':unknown?'checking':'failed';state.unknown=run.revision==='hardened'&&unknown;attempt.stage=observed&&run.revision==='faulty'?'response_lost':unknown?'unknown':'refused';await this.store.setTargetState(runId,state);await this.store.emit(runId,{lane:'application',kind:run.revision==='faulty'&&unknown?'unknown_outcome_presented_failed':unknown?'checking_unknown':'payment_refused',title:state.status==='checking'?'Checking your payment…':'Payment failed. Try again.',detail:run.revision==='faulty'?'The target treats its missing answer as failure. Lab observations do not repair this target.':'The original intent remains protected until authoritative payment state is known.',facts:{responseUnknown:unknown,readAttempted:run.revision==='hardened'}});}
  await this.save(runId,attempt);await refreshRun(this.store,runId,true);
  const cancelled=Boolean((await this.store.record(runId,sessionId)).cancelled);
  if(cancelled)await this.store.updateRun(runId,r=>({...r,stage:r.phoneState==='checking'?'cancelled_uncertain':'cancelled_reconciled',nextAction:'Inspect retained evidence'}));
  else if(attempt.stage==='unknown')await this.store.updateRun(runId,r=>({...r,stage:'inconclusive',verdict:'inconclusive',summary:'The original payment is still uncertain. Its capture reservation remains held; no new purchase is sent.',nextAction:'Read the original PayPal resources'}));
  else if(attempt.stage==='response_lost'&&run.scenarioId==='L2')await this.store.updateRun(runId,r=>({...r,stage:'awaiting_approval',nextAction:'Approve the distinct retry order',summary:'PayPal recorded one charge. The faulty shop says it failed; its customer retry needs a separate approval.'}));
  return this.view(sessionId,runId);
 }
}
