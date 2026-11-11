import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sha256} from "@fracture/paypal-core";
import {analyzeTypeScriptPayments as analyze} from "../packages/analysis/src/typescript";
test("raw Request evidence is revision-bound; comments cannot create findings",()=>{
 const source=`// fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST'})
 const url='https://api-m.sandbox.paypal.com/v2/checkout/orders';
 const request=new Request(url,{method:'POST',headers:{'Content-Type':'application/json'}});
 await fetch(request);`;const r=analyze("checkout.ts",source);assert.equal(r.calls.length,1);assert.equal(r.calls[0]?.source.line,4);assert.equal(r.calls[0]?.source.hash,sha256(source));assert.equal(r.calls[0]?.identity,"absent");
});
test("endpoint identity and generic-only identity have different findings",()=>{
 const r=analyze("checkout.ts",`await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{'Idempotency-Key': key}});
 await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{'PayPal-Request-Id': key}});`);assert.deepEqual(r.calls.map(x=>x.identity),["absent","present"]);assert.equal(r.findings.find(x=>x.factId==="F9")?.severity,"unverified");assert.equal(r.findings.filter(x=>x.source.line===2).length,0);
});
test("dynamic and spread headers cannot be called absent",()=>{
 const r=analyze("checkout.ts",`fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{...headers}});fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers});`);assert.deepEqual(r.calls.map(x=>x.identity),["unknown","unknown"]);assert.ok(r.findings.every(x=>x.severity==="unverified"));
});
test("SDK aliases require package provenance and preserve adapter identity",()=>{
 const r=analyze("checkout.ts",`import {Client as PaymentClient} from 'paypal';import {OrdersController} from '@paypal/paypal-server-sdk';import paypal from 'paypal-rest-sdk';const api=new PaymentClient({});const orders=api.orders;const server=new OrdersController({});orders.createOrder({payPalRequestId:intent,body:{}});server.createOrder({body:{}});paypal.payment.create({intent:'sale'});unrelated.createOrder({body:{}});`);assert.deepEqual(r.calls.map(x=>x.adapter),["apimatic_context","paypal_server_sdk","legacy_paypal"]);assert.equal(r.calls[0]?.identity,"present");
});
test("shadowed aliases do not borrow evidence from another scope",()=>{
 const r=analyze("checkout.ts",`import {Client} from 'paypal';function one(){const api=new Client({});api.orders.createOrder({body:{}})}function two(){const api=new Unrelated();api.orders.createOrder({body:{}})}`);assert.equal(r.calls.length,0);
});
test("reassigned and parameter-shadowed receivers stay unresolved",()=>{
 const r=analyze("checkout.ts",`import {Client} from 'paypal';let api=new Client({});api=new Unrelated();api.orders.createOrder({body:{}});function f(Client){new Client().orders.createOrder({body:{}})}`);assert.equal(r.calls.length,0);
});
test("later spread cannot prove an endpoint header survives",()=>{
 const r=analyze("checkout.ts",`fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{'PayPal-Request-Id':key,...headers}});fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST'});`);assert.deepEqual(r.calls.map(x=>x.identity),["unknown","absent"]);
});
test("outer option spreads cannot prove an explicit header survives",()=>{
 const r=analyze("checkout.ts",`fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{'PayPal-Request-Id':key},...options});`);assert.equal(r.calls[0]?.identity,"unknown");assert.equal(r.findings[0]?.severity,"unverified");
});
test("readonly calls and unrelated hosts do not become mutation risks",()=>{
 const r=analyze("checkout.ts",`fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders/id',{method:'GET'});fetch('https://api-m.sandbox.paypal.com.evil.example/v2/checkout/orders',{method:'POST'});`);assert.equal(r.calls.length,1);assert.equal(r.findings.length,0);
});
test("catch classification stays risk until runtime proof",()=>{
 const r=analyze("checkout.ts",`try{await task()}catch(e){state.status='failed'}try{await task()}catch(e){await gateway.reconcile(id);state.status='failed'}`);assert.equal(r.findings.length,1);assert.equal(r.findings[0]?.severity,"risk");
});
test("actual faulty fixture supplies its real callsites",async()=>{
 const path="apps/fixtures/bramble/faulty.ts";const source=await readFile(path,"utf8");const r=analyze(path,source);assert.equal(r.calls.length,2);assert.ok(r.calls.every(x=>x.adapter==="raw_http"&&x.identity==="absent"));assert.equal(r.findings.filter(x=>x.id.startsWith("unknown-as-failed")).length,1);assert.ok(r.calls.every(x=>source.split("\n")[x.source.line-1]?.includes("transport.fetch")));
});
