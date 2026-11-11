import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {sha256} from "@fracture/paypal-core";
import {bindContractRows,contractRuntimePaths,type ApplicationProof} from "../packages/analysis/src/contract-bindings";

async function fixture(){
 const source=await readFile("apps/fixtures/bramble/hardened.ts","utf8"),tests=await readFile("tests/application.test.ts","utf8");
 const hashes=Object.fromEntries(await Promise.all(contractRuntimePaths.map(async path=>[path,createHash("sha256").update(await readFile(path)).digest("hex")])));
 const rows=bindContractRows(source,tests,hashes,null);const names=[...new Set(rows.map(row=>row.test.label))];
 const testCases=["sqlite","postgres"].flatMap(adapter=>names.map(name=>({name:`${adapter}: ${name}`,status:"pass"})));
 const proof:ApplicationProof={source:"sample",testedAt:"2026-11-11T00:00:00Z",failed:0,passed:testCases.length,adapters:["sqlite","postgresql"],sourceHashes:hashes,testCases};
 return {source,tests,hashes,proof};
}
test("contract evidence binds exact source/test spans and only supported categories",async()=>{
 const f=await fixture();const rows=bindContractRows(f.source,f.tests,f.hashes,f.proof);assert.equal(rows.filter(row=>row.status==="verified").length,4);assert.equal(rows.find(row=>row.category==="OPTIONAL FIELDS")?.status,"bound");
 for(const row of rows){assert.ok(row.source.line>1&&row.test.line>1);assert.ok(f.tests.split("\n")[row.test.line-1]?.includes(row.test.label));assert.equal(row.source.hash,sha256(f.source));assert.equal(row.test.hash,sha256(f.tests));}
});
test("a stale provider, fixture, database or test hash invalidates all verification",async()=>{
 const f=await fixture();for(const path of contractRuntimePaths){const rows=bindContractRows(f.source,f.tests,{...f.hashes,[path]:"f".repeat(64)},f.proof);assert.ok(rows.every(row=>row.status!=="verified"));}
});
test("missing, failed, duplicate, absent-adapter and malformed receipts never verify",async()=>{
 const f=await fixture();const cases:unknown[]=[null,{}, {...f.proof,testCases:undefined},{...f.proof,failed:1},{...f.proof,adapters:[]},{...f.proof,source:"live_sandbox"},{...f.proof,testedAt:"unknown"},{...f.proof,testCases:f.proof.testCases!.map(item=>({...item,status:"fail"}))},{...f.proof,testCases:[...f.proof.testCases!,...f.proof.testCases!],passed:f.proof.passed*2}];
 for(const proof of cases){const rows=bindContractRows(f.source,f.tests,f.hashes,proof as ApplicationProof|null);assert.ok(rows.every(row=>row.status!=="verified"));}
 const oneAdapterMissing={...f.proof,testCases:f.proof.testCases!.filter(item=>item.name.startsWith("sqlite:")),passed:f.proof.passed/2};assert.ok(bindContractRows(f.source,f.tests,f.hashes,oneAdapterMissing).every(row=>row.status!=="verified"));
});
