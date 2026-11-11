import { randomUUID, createHash } from 'node:crypto';
import { canonicalJson } from '@fracture/paypal-core';
import { z } from 'zod';
export const hash = (value: unknown) => createHash('sha256').update(typeof value==='string'?value:canonicalJson(value)).digest('hex');
export const arms = ['provider_same','provider_different','generic_same','generic_different'] as const;
export type Arm = typeof arms[number];
const uuid=z.string().uuid();
export const slotSchema=z.object({key:z.string(),trial:z.number().int().min(1).max(5),arm:z.enum(arms),attempt:z.number().int().min(1).max(2),genericId:uuid,providerId:uuid.nullable(),customId:z.string().max(127)}).strict();
export type Slot=z.infer<typeof slotSchema>;
export const manifestSchema=z.object({version:z.literal(1),id:uuid,createdAt:z.string().datetime(),endpoint:z.literal('POST /v2/checkout/orders'),environment:z.literal('sandbox'),sdkCommit:z.literal('5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2'),documentation:z.object({url:z.string().url(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),merchantFingerprint:z.string().regex(/^[a-f0-9]{64}$/),maximumCreateCalls:z.literal(40),maximumCapturedMinor:z.literal(0),slots:z.array(slotSchema).length(40),sourceHashes:z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/))}).strict();
export type Manifest=z.infer<typeof manifestSchema>;
export const orderBody=(slot:Slot)=>({intent:'CAPTURE' as const,purchaseUnits:[{amount:{currencyCode:'USD',value:'1.00'},customId:slot.customId}]});
export const wireBody=(slot:Slot)=>({intent:'CAPTURE',purchase_units:[{amount:{currency_code:'USD',value:'1.00'},custom_id:slot.customId}]});
export function validateManifest(input:unknown):Manifest{
 const m=manifestSchema.parse(input);const seen=new Set<string>();const genericFamilies=new Set<string>();const providerFamilies=new Set<string>();
 for(let trial=1;trial<=5;trial++)for(const arm of arms){const pair=m.slots.filter(s=>s.trial===trial&&s.arm===arm);if(pair.length!==2||pair[0]?.attempt!==1||pair[1]?.attempt!==2)throw Error('INVALID_PAIR_ORDER');const a=pair[0],b=pair[1];if(!a||!b)throw Error('PAIR_MISSING');
  for(const slot of pair){if(slot.key!==`${trial}:${arm}:${slot.attempt}`||seen.has(slot.key)||slot.customId!==`fracture-f9-${m.id}-${trial}`)throw Error('INVALID_SLOT');seen.add(slot.key);}
  if((a.genericId===b.genericId)!==(arm==='generic_same'))throw Error('GENERIC_TREATMENT_CHANGED');
  if(arm.startsWith('provider_')){if(!a.providerId||!b.providerId||(a.providerId===b.providerId)!==(arm==='provider_same'))throw Error('PROVIDER_TREATMENT_CHANGED');}else if(a.providerId||b.providerId)throw Error('UNDECLARED_PROVIDER_KEY');
  for(const id of new Set(pair.map(x=>x.genericId))){if(genericFamilies.has(id))throw Error('CROSSED_GENERIC_KEY');genericFamilies.add(id);}
  for(const id of new Set(pair.flatMap(x=>x.providerId?[x.providerId]:[]))){if(providerFamilies.has(id)||genericFamilies.has(id))throw Error('CROSSED_PROVIDER_KEY');providerFamilies.add(id);}
 }
 if([...genericFamilies].some(id=>providerFamilies.has(id)))throw Error('CROSSED_KEY_FAMILIES');return m;
}
export function prepareManifest(input:Pick<Manifest,'documentation'|'merchantFingerprint'|'sourceHashes'>):Manifest{
 const id=randomUUID(),slots:Slot[]=[];
 for(let trial=1;trial<=5;trial++){
  const order=arms.map(arm=>({arm,rank:randomUUID()})).sort((a,b)=>a.rank.localeCompare(b.rank));
  for(const {arm} of order){const generic=randomUUID(),provider=randomUUID();for(const attempt of [1,2])slots.push({key:`${trial}:${arm}:${attempt}`,trial,arm,attempt,genericId:arm==='generic_same'||attempt===1?generic:randomUUID(),providerId:arm==='provider_same'?provider:arm==='provider_different'?(attempt===1?provider:randomUUID()):null,customId:`fracture-f9-${id}-${trial}`});}
 }
 return validateManifest({version:1,id,createdAt:new Date().toISOString(),endpoint:'POST /v2/checkout/orders',environment:'sandbox',sdkCommit:'5d0df8a8817e5fdf2e2cd48e68f790ea4730aab2',documentation:input.documentation,merchantFingerprint:input.merchantFingerprint,sourceHashes:input.sourceHashes,maximumCreateCalls:40,maximumCapturedMinor:0,slots});
}
