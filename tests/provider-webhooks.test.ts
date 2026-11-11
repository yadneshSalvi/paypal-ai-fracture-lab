import 'dotenv/config';
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import pg from 'pg';
import {DeliveryObserver,DeliveryStore,handleDelivery} from '../packages/provider-webhooks/src/observer';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const sandbox={environment:'sandbox' as const,baseUrl:'https://api-m.sandbox.paypal.com',clientId:'webhook-fixture-client',clientSecret:'webhook-fixture-secret',isolatedProject:'fracture-webhook-test'};
const event=(orderId='ORDERFIXTURE1',eventId='WH-FIXTURE1')=>JSON.stringify({id:eventId,event_type:'PAYMENT.CAPTURE.COMPLETED',create_time:'2026-11-11T00:00:00Z',resource:{id:'CAPTUREFIXTURE1',status:'COMPLETED',supplementary_data:{related_ids:{order_id:orderId}},payer:{private_note:'Private fixture data, not public evidence'}}});
const headers=()=>new Headers({'content-type':'application/json','paypal-transmission-id':randomUUID(),'paypal-transmission-time':new Date().toISOString(),'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-FIXTURE','paypal-auth-algo':'SHA256withRSA','paypal-transmission-sig':'fixture-signature'});
const json=(value:unknown,status=200)=>Response.json(value,{status});
async function setup(t:TestContext,mode:'success'|'rejected'|'unavailable'='success'){
 const admin=new pg.Pool({connectionString:process.env.DATABASE_URL}),schema='webhook_test_'+randomUUID().replaceAll('-','');await admin.query(`CREATE SCHEMA ${schema}`);
 const url=new URL(process.env.DATABASE_URL!);url.searchParams.set('options',`-c search_path=${schema}`);const pool=new pg.Pool({connectionString:url.toString(),max:8}),store=new DeliveryStore(pool,{scope:hash(sandbox.clientId),webhookId:'WH-REGISTERED-FIXTURE',source:'sample',key:randomBytes(32)});await store.initialize();
 t.after(async()=>{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();});
 const requests:{path:string;body:string}[]=[];
 const transport:typeof fetch=async input=>{const request=new Request(input),path=new URL(request.url).pathname;assert.equal(request.redirect,'error');assert.ok(request.signal);const body=await request.clone().text();requests.push({path,body});
  if(path==='/v1/oauth2/token'){assert.match(request.headers.get('authorization')??'',/^Basic /);assert.equal(body,'grant_type=client_credentials');return json({access_token:'private-fixture-token',expires_in:3600});}
  assert.equal(path,'/v1/notifications/verify-webhook-signature');assert.equal(request.headers.get('authorization'),'Bearer private-fixture-token');
  const pending=(await pool.query("SELECT count(*) AS n FROM fracture_native_deliveries WHERE classification='received'")).rows[0].n;assert.ok(Number(pending)>0,'raw intake is durable before verification');
  if(mode==='unavailable')return json({error:'temporary'},503);return json({verification_status:mode==='success'?'SUCCESS':'FAILURE'});
 };
 return {pool,store,observer:new DeliveryObserver(store,sandbox,transport),requests};
}
test('actual core postback preserves raw event bytes, exact registered identity and encrypted private original',async t=>{
 const {observer,store,pool,requests}=await setup(t),raw=event().replace('"resource":','"resource":  '),h=headers(),result=await observer.ingest(raw,h);assert.equal(result.classification,'verified_new');assert.equal(result.status,200);assert.equal(requests.length,2);
 const verification=requests[1]!;assert.ok(verification.body.endsWith(`"webhook_event":${raw}}`));assert.equal(JSON.parse(verification.body).webhook_id,'WH-REGISTERED-FIXTURE');
 const row=(await pool.query('SELECT * FROM fracture_native_deliveries')).rows[0];assert.equal(row.body_hash,hash(raw));assert.equal(row.source,'sample');assert.ok(!row.private_evidence.includes('Private fixture'));assert.equal(JSON.stringify(row).includes('private-fixture-token'),false);assert.equal(row.verification_trace.verificationStatus,'SUCCESS');
 const original=await store.privateEvidence(result.attemptId);assert.equal(original.rawBody,raw);assert.equal(original.headers['paypal-transmission-sig'],h.get('paypal-transmission-sig'));
 const wrongKey=new DeliveryStore(pool,{...store.config,key:randomBytes(32)});await assert.rejects(wrongKey.privateEvidence(result.attemptId));
});
test('concurrent duplicate signed-fixture deliveries retain every intake but admit one canonical observation',async t=>{
 const {observer,pool}=await setup(t),results=await Promise.all(Array.from({length:8},()=>observer.ingest(event(),headers())));assert.equal(results.filter(x=>x.classification==='verified_new').length,1);assert.equal(results.filter(x=>x.classification==='verified_duplicate').length,7);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,1);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_deliveries')).rows[0].n,8);
});
test('same verified event identity with different bytes quarantines the later intake without changing canonical evidence',async t=>{
 const {observer,pool}=await setup(t),first=await observer.ingest(event(),headers());const changed=event().replace('COMPLETED","supplementary','PENDING","supplementary');const result=await observer.ingest(changed,headers());assert.equal(result.status,409);assert.equal(result.classification,'event_conflict');const row=(await pool.query('SELECT * FROM fracture_native_events')).rows[0];assert.equal(row.first_delivery_id,first.attemptId);assert.equal(row.body_hash,hash(event()));
});
test('provider verification outage stays unverified and does not admit a canonical event',async t=>{
 const {observer,pool}=await setup(t,'unavailable'),result=await observer.ingest(event(),headers());assert.equal(result.status,503);assert.equal(result.classification,'verification_unavailable');assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,0);assert.equal((await pool.query('SELECT verification_trace FROM fracture_native_deliveries')).rows[0].verification_trace.httpStatus,503);
});
test('forged and missing signatures cannot reach canonical event storage',async t=>{
 const {observer,pool,requests}=await setup(t,'rejected'),result=await observer.ingest(event(),headers());assert.equal(result.status,400);const missing=headers();missing.delete('paypal-transmission-sig');await assert.rejects(observer.ingest(event(),missing),/HEADERS/);assert.equal(requests.length,2);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,0);
});
test('untrusted certificate URL is never fetched and remains rejected evidence',async t=>{
 const {observer,requests,pool}=await setup(t),h=headers();h.set('paypal-cert-url','https://attacker.invalid/cert');const result=await observer.ingest(event(),h);assert.equal(result.classification,'rejected');assert.equal(requests.length,0);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_deliveries')).rows[0].n,1);
});
test('one armed500 commits the observation first; concurrent redeliveries acknowledge without repeating admission',async t=>{
 const {observer,store,pool}=await setup(t);await store.armSingleFailure({id:randomUUID(),eventType:'PAYMENT.CAPTURE.COMPLETED',orderId:'ORDERFIXTURE1',expiresAt:new Date(Date.now()+60000).toISOString()});
 const results=await Promise.all(Array.from({length:5},()=>observer.ingest(event(),headers())));assert.equal(results.filter(x=>x.status===500).length,1);assert.equal(results.filter(x=>x.status===200).length,4);assert.equal(results.filter(x=>x.classification==='verified_new').length,1);const rule=(await pool.query('SELECT used_delivery_id FROM fracture_delivery_rules')).rows[0];assert.equal(rule.used_delivery_id,results.find(x=>x.status===500)!.attemptId);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,1);
 await assert.rejects(store.armSingleFailure({id:randomUUID(),eventType:'PAYMENT.CAPTURE.COMPLETED',orderId:'ORDERFIXTURE1',expiresAt:new Date(Date.now()+60000).toISOString()}),/ALREADY/);
});
test('armed failure requires the exact order and event type inside its original time window',async t=>{
 const {observer,store,pool}=await setup(t);await store.armSingleFailure({id:randomUUID(),eventType:'PAYMENT.CAPTURE.COMPLETED',orderId:'ORDERFIXTURE1',expiresAt:new Date(Date.now()+60000).toISOString()});assert.equal((await observer.ingest(event('OTHERORDER'),headers())).status,200);
 assert.equal((await observer.ingest(event('ORDERFIXTURE1','WH-OTHER').replace('PAYMENT.CAPTURE.COMPLETED','PAYMENT.CAPTURE.PENDING'),headers())).status,200);await pool.query("UPDATE fracture_delivery_rules SET expires_at=now()-interval '1 second'");assert.equal((await observer.ingest(event('ORDERFIXTURE1','WH-EXPIRED'),headers())).status,200);assert.equal((await pool.query('SELECT used_delivery_id FROM fracture_delivery_rules')).rows[0].used_delivery_id,null);
});
test('HTTP intake rejects wrong format, malformed UTF8 and oversized stream without provider calls',async t=>{
 const {observer,requests}=await setup(t);assert.equal((await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',body:'bad'}),observer)).status,415);
 assert.equal((await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',headers:headers(),body:Buffer.from([0xc3,0x28])}),observer)).status,400);
 assert.equal((await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',headers:headers(),body:' '.repeat(262145)}),observer)).status,413);
 assert.equal((await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',headers:headers(),body:'{}'}),observer)).status,400);assert.equal(requests.length,0);
});
test('HTTP route accepts a valid provider request without browser origin or judge cookie',async t=>{
 const {observer}=await setup(t),result=await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',headers:headers(),body:event()}),observer);assert.equal(result.status,200);assert.deepEqual(await result.json(),{received:true});assert.equal(result.headers.get('cache-control'),'no-store');
});
test('SQL failure cannot acknowledge a half-committed event or consume its one500 rule',async t=>{
 const {observer,store,pool}=await setup(t);await store.armSingleFailure({id:randomUUID(),eventType:'PAYMENT.CAPTURE.COMPLETED',orderId:'ORDERFIXTURE1',expiresAt:new Date(Date.now()+60000).toISOString()});
 await pool.query("CREATE FUNCTION fail_verified() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.verified_at IS NOT NULL THEN RAISE EXCEPTION 'fixture transaction failure'; END IF; RETURN NEW; END$$; CREATE TRIGGER fixture_verified_failure BEFORE UPDATE ON fracture_native_deliveries FOR EACH ROW EXECUTE FUNCTION fail_verified()");
 const response=await handleDelivery(new Request('https://test/api/webhooks/paypal',{method:'POST',headers:headers(),body:event()}),observer);assert.equal(response.status,503);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,0);assert.equal((await pool.query('SELECT used_delivery_id FROM fracture_delivery_rules')).rows[0].used_delivery_id,null);
 await pool.query('DROP TRIGGER fixture_verified_failure ON fracture_native_deliveries');const recovered=await observer.ingest(event(),headers());assert.equal(recovered.status,500);assert.equal((await observer.ingest(event(),headers())).status,200);assert.equal((await pool.query('SELECT count(*)::int n FROM fracture_native_events')).rows[0].n,1);
});
test('a separately scoped observer cannot read another merchant private evidence or consume its rule',async t=>{
 const {observer,store,pool}=await setup(t),result=await observer.ingest(event(),headers());const other=new DeliveryStore(pool,{...store.config,scope:hash('another-merchant')});await assert.rejects(other.privateEvidence(result.attemptId),/NOT_FOUND/);
});
