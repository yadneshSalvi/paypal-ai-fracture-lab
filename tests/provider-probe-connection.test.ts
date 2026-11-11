import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {assertDirectProbePool,probeDatabaseConnections} from '../packages/provider-probes/src/connection';
import {ProbeStore} from '../packages/provider-probes/src/store';

test('pooled hosted campaigns require the identical explicit direct endpoint and database',()=>{
 const query='postgres://fixture:private@ep-fixture-pooler.us-east-1.aws.neon.tech/probes?sslmode=require';
 const direct='postgres://fixture:private@ep-fixture.us-east-1.aws.neon.tech/probes?sslmode=require';
 assert.throws(()=>probeDatabaseConnections({DATABASE_URL:query}),/DIRECT_DATABASE_REQUIRED/);
 assert.deepEqual(probeDatabaseConnections({DATABASE_URL:query,DATABASE_URL_UNPOOLED:direct}),{query,lock:direct});
 for(const wrong of [query,direct.replace('/probes','/other'),direct.replace('ep-fixture.','ep-other.'),direct.replace('fixture:private','other:private')])assert.throws(()=>probeDatabaseConnections({DATABASE_URL:query,DATABASE_URL_UNPOOLED:wrong}),/IDENTITY_MISMATCH/);
});
test('known pooler hosts and transaction-pool ports reject before campaign execution',()=>{
 for(const connectionString of ['postgres://u:p@ep-fixture-pooler.aws.neon.tech/db','postgres://u:p@pgbouncer.internal/db','postgres://u:p@db.example:6543/db']){
  const pool=new pg.Pool({connectionString});assert.throws(()=>assertDirectProbePool(pool),/DIRECT_DATABASE_REQUIRED/);void pool.end();
 }
 const local='postgres://u:p@127.0.0.1:5432/probes';assert.deepEqual(probeDatabaseConnections({DATABASE_URL:local}),{query:local,lock:local});
});
test('unconfirmed lock release retires its connection and cannot report success',async()=>{
 let discarded:boolean|undefined,calls=0;const client={query:async()=>({rows:++calls===1?[{ok:true}]:[{released:false}]}),release:(value:boolean)=>{discarded=value}};
 const pool={options:{host:'127.0.0.1'},connect:async()=>client} as unknown as pg.Pool;
 await assert.rejects(new ProbeStore(pool).withLock('fixture',async()=>true),/LOCK_RELEASE_NOT_CONFIRMED/);assert.equal(discarded,true);
});
