import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { getService } from "../packages/service/src/index";
import { modelDiagnosis } from "../packages/ai/src/diagnosis";
import { artifactPath } from "../packages/service/src/config";
const service=await getService();const session=await service.store.createSession("owner");
try{
  const run=await service.startRun(session.id,{projectId:"bramble",scenarioId:"S0",revision:"faulty",mode:"sample",seed:"model-diagnosis-qualification-v1",requestId:randomUUID(),interactive:false});
  const diagnosis=await modelDiagnosis(service.store,session.id,run);const rows=await service.store.db.query<{document:string}&Record<string,unknown>>("SELECT document FROM lab_model_attempts WHERE session_id=$1 AND run_id=$2",[session.id,run.id]);const attempts=rows.rows.map(row=>{const item=JSON.parse(row.document) as Record<string,unknown>;return {attemptId:item.attemptId,role:item.role,model:item.model,status:item.status,inputHash:item.inputHash,durationMs:item.durationMs};});
  const proof={schemaVersion:1,source:"sample",paymentTraffic:"Local fixture only; zero PayPal requests",modelTraffic:"Actual OpenAI Responses API calls",qualifiedAt:new Date().toISOString(),runId:run.id,scenarioHash:run.scenarioHash,sourceHash:run.sourceHash,diagnosis,attempts,limitations:["One task-specific diagnosis qualification; no claim about the 600-attempt context study.","The model selected a run-owned read tool; no financial write tool was available."]};await writeFile(artifactPath("docs/evidence/model-diagnosis-qualification.json"),JSON.stringify(proof,null,2)+"\n");console.log(JSON.stringify({status:diagnosis.status,model:diagnosis.model,observedStatus:diagnosis.experiment.observedStatus,receipt:diagnosis.experiment.receiptId,attempts:attempts.map(attempt=>({role:attempt.role,status:attempt.status,durationMs:attempt.durationMs})),artifact:"docs/evidence/model-diagnosis-qualification.json"},null,2));
}finally{await service.store.db.close();}
