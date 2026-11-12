import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {setupSourceExecution,controlledReceipt} from "./source-execution-helpers";
import {SourceExecutionViews} from "../packages/source-execution-view/src/store";
import {objectHash} from "../packages/source-execution/src/hash";

async function fixture(t:Parameters<typeof setupSourceExecution>[0]){
  const f=await setupSourceExecution(t),prepared=await f.prepare(["lost"]);
  const approved=await f.service.approve(f.owner,{planId:prepared.plan.id,expectedPlanHash:prepared.plan.planHash,requestId:randomUUID()});
  await f.service.runNext("view-receipt-double",{execute:async bundle=>controlledReceipt(bundle,"failed")},{jobId:approved.job.id,maximumCases:1});
  const viewer=await f.lab.createSession("judge"),views=new SourceExecutionViews(f.lab),input={jobId:approved.job.id,requestId:randomUUID()},connection=await views.connect(viewer.id,input);
  const approval={connectionId:connection.id,jobId:approved.job.id,requestId:randomUUID()};
  return{...f,jobId:approved.job.id,viewer,views,input,connection,approval};
}
test("receipt view requires a separate owner approval; exact recovery and source-free digest remain stable",async t=>{
  const f=await fixture(t);assert.deepEqual((await f.views.list(f.viewer.id)).jobs,[]);
  await assert.rejects(f.views.get(f.viewer.id,f.jobId));
  assert.equal((await f.views.connect(f.viewer.id,f.input)).id,f.connection.id);
  await assert.rejects(f.views.approve({sessionId:f.viewer.id,grantId:f.owner.grantId},f.approval));
  const granted=await f.views.approve(f.owner,f.approval);assert.equal(granted.status,"approved");
  assert.deepEqual(await f.views.approve(f.owner,f.approval),granted);
  const first=await f.views.get(f.viewer.id,f.jobId),second=await f.views.get(f.viewer.id,f.jobId);
  assert.equal(first.contentHash,second.contentHash);const{contentHash,...body}=first;assert.equal(objectHash(body),contentHash);
  assert.equal(first.cases[0]!.status,"failed");assert.equal(first.cases[0]!.receipt?.observation?.testDouble,true);
  assert.equal(first.authority.execute,false);assert.equal(first.originalImportExecution,"static_only");
  assert.ok(first.plan.files.every(file=>!("content"in file)));assert.equal((await f.lab.db.query("SELECT id FROM lab_runs WHERE session_id=$1",[f.viewer.id])).rows.length,0);
});
test("cancelling a view withdraws access without changing the execution or original failure",async t=>{
  const f=await fixture(t);await f.views.approve(f.owner,f.approval);const original=await f.service.getJob(f.owner,{jobId:f.jobId});
  assert.equal((await f.views.cancel(f.viewer.id,f.connection.id)).status,"cancelled");await assert.rejects(f.views.get(f.viewer.id,f.jobId));
  assert.deepEqual(await f.service.getJob(f.owner,{jobId:f.jobId}),original);await assert.rejects(f.views.approve(f.owner,f.approval));
});
test("revoking the original owner or altering the original viewer expiry cannot revive a receipt grant",async t=>{
  const f=await fixture(t);await f.views.approve(f.owner,f.approval);
  await f.db.query("UPDATE lab_developer_grants SET revoked_at=$2 WHERE id=$1",[f.owner.grantId,new Date().toISOString()]);
  assert.equal((await f.views.connection(f.viewer.id,{id:f.connection.id})).status,"expired");await assert.rejects(f.views.get(f.viewer.id,f.jobId));
  await f.db.query("UPDATE lab_sessions SET expires_at=$2 WHERE id=$1",[f.viewer.id,new Date(Date.now()+172800000).toISOString()]);
  await assert.rejects(f.views.connection(f.viewer.id,{id:f.connection.id}));
});
test("changed receipt bytes and conflicting original request identities fail closed",async t=>{
  const f=await fixture(t);await f.views.approve(f.owner,f.approval);
  await assert.rejects(f.views.connect(f.viewer.id,{...f.input,jobId:randomUUID()}));
  const artifact=(await f.db.query<{id:string;document:string}&Record<string,unknown>>("SELECT id,document FROM lab_source_execution_artifacts_v1 WHERE job_id=$1 AND kind='executor_receipt'",[f.jobId])).rows[0]!;
  const changed=JSON.parse(artifact.document);changed.status="passed";await f.db.query("UPDATE lab_source_execution_artifacts_v1 SET document=$2 WHERE id=$1",[artifact.id,JSON.stringify(changed)]);
  await assert.rejects(f.views.get(f.viewer.id,f.jobId));
});
