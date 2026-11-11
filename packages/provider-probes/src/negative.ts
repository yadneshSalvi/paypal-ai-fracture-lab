import {z} from 'zod';
import type {EvidenceDTO,ProviderFactDTO} from '@fracture/contracts';
const fingerprint=z.string().regex(/^[a-f0-9]{64}$/),time=z.iso.datetime();
export const negativeCodes=['INSTRUMENT_DECLINED','DUPLICATE_INVOICE_ID','PAYER_CANNOT_PAY'] as const;
const read=z.object({at:time,httpStatus:z.literal(200),bodyHash:fingerprint,orderHash:fingerprint,state:z.literal('CREATED'),captures:z.literal(0),authorizations:z.literal(0)});
const response=z.object({at:time,httpStatus:z.number().int(),bodyHash:fingerprint,requestHash:fingerprint,typedKind:z.string(),name:z.string(),issues:z.array(z.string())});
const schema=z.object({schemaVersion:z.literal(1),factId:z.literal('F5'),source:z.literal('live_sandbox'),faultSource:z.literal('provider_negative'),protocolHash:fingerprint,sdkCommit:z.literal('5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2'),observedAt:time,finishedAt:time,endpoint:z.literal('/v2/checkout/orders/{id}/capture'),mockHeader:z.literal('PayPal-Mock-Response'),codes:z.array(z.enum(negativeCodes)).length(3),documentation:z.array(z.object({url:z.url(),hash:fingerprint})).length(2),trials:z.array(z.object({id:z.string(),orderHash:fingerprint,create:z.object({startedAt:time,status:z.literal(201),requestHash:fingerprint,responseHash:fingerprint}),arms:z.array(z.object({id:z.string(),code:z.enum(negativeCodes).nullable(),state:z.string(),requestIdHash:fingerprint,before:read,after:read,response})).length(4)})).length(5),limits:z.object({creates:z.literal(5),captureRequests:z.literal(20),approvals:z.literal(0),successfulCaptures:z.literal(0),authorizations:z.literal(0),refunds:z.literal(0)})});
/** Displayed coverage is derived from matched observations, never from a stored success label. */
export function inspectNegativeCampaign(body:Record<string,unknown>){
 const parsed=schema.safeParse(body);if(!parsed.success)return null;const data=parsed.data;
 if(new Set(data.codes).size!==3||new Set(data.trials.map(t=>t.id)).size!==5||new Set(data.trials.map(t=>t.orderHash)).size!==5||data.trials.some((t,i)=>t.id!==`trial-${i+1}`))return null;
 const arms=data.trials.flatMap(t=>t.arms);if(new Set(arms.map(a=>a.requestIdHash)).size!==20||new Set(arms.map(a=>a.response.requestHash)).size!==20)return null;
 for(const trial of data.trials){
  if(trial.arms[0]?.id!=='native-control'||trial.arms[0]?.code!==null||new Set(trial.arms.map(a=>a.id)).size!==4||negativeCodes.some(c=>!trial.arms.some(a=>a.id===c&&a.code===c)))return null;
  let last=Date.parse(trial.create.startedAt);
  for(const a of trial.arms){
   if(a.before.orderHash!==trial.orderHash||a.after.orderHash!==trial.orderHash||Date.parse(a.before.at)<last||Date.parse(a.response.at)<Date.parse(a.before.at)||Date.parse(a.after.at)<Date.parse(a.response.at)||Date.parse(a.after.at)>Date.parse(data.finishedAt)||Date.parse(data.finishedAt)>Date.parse(data.observedAt))return null;
   last=Date.parse(a.after.at);
  }
 }
 const observed=(a:typeof arms[number],expected:string)=>a.state==='verified'&&a.response.httpStatus===422&&a.response.typedKind==='error5'&&a.response.name==='UNPROCESSABLE_ENTITY'&&a.response.issues.length===1&&a.response.issues[0]===expected;
 const pairs=negativeCodes.map(code=>({code,trials:data.trials.map(t=>({id:t.id,control:observed(t.arms[0]!,'ORDER_NOT_APPROVED'),injected:observed(t.arms.find(a=>a.code===code)!,code)}))})).map(pair=>({...pair,qualified:pair.trials.filter(t=>t.control&&t.injected).length}));
 return {data,pairs,qualifiedPairs:pairs.filter(p=>p.qualified===5).length,qualifiedTrials:data.trials.filter(t=>observed(t.arms[0]!,'ORDER_NOT_APPROVED')&&t.arms.slice(1).every(a=>observed(a,a.code!))).length};
}
export function negativePairFact(evidence:EvidenceDTO):ProviderFactDTO|null{
 const r=inspectNegativeCampaign(evidence.body);if(!r)return null;
 return{id:'F5',title:'Native negative/control pairs',endpoint:r.data.endpoint,method:'POST',sdkCommit:r.data.sdkCommit,status:r.qualifiedPairs===3?'supported_observation':'inconclusive',statement:`${r.qualifiedPairs} of three selected capture error codes returned the requested provider-negative response in all five matched trials. Native controls returned ORDER_NOT_APPROVED.`,limitation:'Injected sandbox errors on unapproved USD1 orders only. No approved-payer decline, invoice uniqueness behavior, actual captured payment, or completed application N1–N3 suite is established.',scope:'One isolated US sandbox merchant · five original unapproved orders · no captured funds',source:'live_sandbox',observedAt:r.data.observedAt,repetitions:r.qualifiedTrials,requiredRepetitions:5,documentationUrl:'https://developer.paypal.com/negative-testing/request-headers',evidenceIds:[evidence.id]};
}
