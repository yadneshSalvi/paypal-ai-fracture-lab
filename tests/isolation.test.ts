import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectCandidate } from "../packages/isolation/src/policy";
import { assertTargetSql } from "../packages/isolation/src/capabilities";
test("candidate policy accepts the original bounded checkout and rejects ambient execution",async()=>{
  assert.ok(inspectCandidate(await readFile("apps/fixtures/bramble/faulty.ts","utf8")).every(check=>check.passed));
  assert.ok(inspectCandidate(await readFile("apps/fixtures/bramble/hardened.ts","utf8")).every(check=>check.passed));
  for(const source of ["import fs from 'node:fs'; export async function faultyCheckout(){return fs.readFileSync('.env');}","export async function faultyCheckout(){ return process.env.PAYPAL_CLIENT_SECRET; }","export async function faultyCheckout(){ const f=({}).constructor.constructor; return f('return process')(); }","export async function faultyCheckout(){ const {constructor: f}=()=>{}; return f('return process')(); }","export async function faultyCheckout(){ const {'constructor': f}=()=>{}; return f('return process')(); }","export async function faultyCheckout(){ return fetch('https://api-m.sandbox.paypal.com.evil.invalid/'); }","export async function faultyCheckout(){ return import('node:child_process'); }"]){assert.ok(inspectCandidate(source).some(check=>!check.passed));}
});
test("SQL capability cannot alter provider observations, schemas or attached databases",()=>{
  for(const sql of ["DELETE FROM lab_provider_resources WHERE run_id=$1","UPDATE lab_events SET document=$1","SELECT * FROM lab_model_attempts","ATTACH DATABASE '/host/secret' AS other","INSERT INTO lab_fulfillments(id) VALUES($1); DELETE FROM lab_runs","PRAGMA writable_schema=1"]){assert.throws(()=>assertTargetSql(sql),/CANDIDATE_SQL_DENIED/);}
  assert.doesNotThrow(()=>assertTargetSql("INSERT INTO lab_fulfillments(id,entitlement_key) VALUES($1,$2) ON CONFLICT(run_id,entitlement_key) DO NOTHING"));assert.doesNotThrow(()=>assertTargetSql("INSERT INTO lab_target_state(run_id,intent_id,document) VALUES($1,$2,$3) ON CONFLICT(run_id,intent_id) DO UPDATE SET document=$3"));assert.doesNotThrow(()=>assertTargetSql("SELECT * FROM paycore_operations WHERE id=$1 FOR UPDATE"));
});
