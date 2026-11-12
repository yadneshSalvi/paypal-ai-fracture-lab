import { z } from "zod";
import { canonicalJson, sha256 } from "@fracture/paypal-core";
import { LabError } from "../../service/src/errors";
import { inspectCandidate } from "./policy";
import { runIsolatedContainer } from "./local";
import { runCloudSandbox, type CloudCredentials } from "./cloud";

/**
 * A generated regression test is DATA, never code: one declarative purchase case authored with the candidate.
 * It runs through the pinned runner's own executor and standing assertions, once against the faulty baseline
 * and once against the candidate. It is additional to the nine frozen public regressions and cannot replace,
 * edit or weaken them: the frozen suite still runs separately and alone decides verified status.
 */
export const faultKeys=["dropCaptureResponse","unavailableReread","authFailure","malformedSuccess","capturePending"] as const;
const faults=z.strictObject(Object.fromEntries(faultKeys.map(key=>[key,z.boolean()])) as Record<typeof faultKeys[number],z.ZodBoolean>);
export const generatedTestSchema=z.strictObject({
  name:z.string().min(10).max(160),rationale:z.string().min(20).max(900),faults,
  purchaseAttempts:z.number().int().min(1).max(8),concurrent:z.boolean(),
  expected:z.strictObject({completedCaptures:z.number().int().min(0).max(2),entitlements:z.number().int().min(0).max(2),customerState:z.enum(["paid","checking","failed","any"])}),
});
export type GeneratedTestSpec=z.infer<typeof generatedTestSchema>;
/** JSON Schema twin for the strict structured-output request. */
export const generatedTestJsonSchema={type:"object",additionalProperties:false,required:["name","rationale","faults","purchaseAttempts","concurrent","expected"],properties:{name:{type:"string"},rationale:{type:"string"},faults:{type:"object",additionalProperties:false,required:[...faultKeys],properties:Object.fromEntries(faultKeys.map(key=>[key,{type:"boolean"}]))},purchaseAttempts:{type:"integer"},concurrent:{type:"boolean"},expected:{type:"object",additionalProperties:false,required:["completedCaptures","entitlements","customerState"],properties:{completedCaptures:{type:"integer"},entitlements:{type:"integer"},customerState:{type:"string",enum:["paid","checking","failed","any"]}}}}};
export interface GeneratedRegressionTest {schemaVersion:1;spec:GeneratedTestSpec;specHash:string;author:{kind:"model";model:string;modelEvidenceId:string};baseHash:string;candidateHash:string}
export const generatedTestHash=(spec:GeneratedTestSpec)=>sha256(canonicalJson(spec));

/** The runner's own case shape (packages/isolation/runner/suite.ts). The id is fixed so no frozen case-specific branch applies. */
export function runnerCase(spec:GeneratedTestSpec){
  return {id:"generated",name:spec.name,faults:Object.fromEntries(faultKeys.filter(key=>spec.faults[key]).map(key=>[key,true])),calls:spec.purchaseAttempts,...(spec.concurrent?{concurrent:true}:{}),expected:{captures:spec.expected.completedCaptures,fulfillments:spec.expected.entitlements,...(spec.expected.customerState==="any"?{}:{phone:spec.expected.customerState})}};
}
/** Trusted host-authored harness. It loads the pinned runner from the read-only reference tree, loads only the generated case, and reuses the runner's executor unchanged. */
export const generatedTestHarness=`let input="";for await(const chunk of process.stdin){input+=String(chunk);if(input.length>260000)throw new Error("Generated-test input exceeds the runner limit.");}
const {baseline,candidate,test}=JSON.parse(input);
const suite=await import("/snapshot/packages/isolation/runner/suite.ts");
const frozenCases=suite.cases.length;suite.cases.splice(0,suite.cases.length,test);
const run=async source=>{const started=Date.now();const r=await suite.runSuite(source);return {stage:r.stage,sourceHash:r.candidateHash??null,runnerHash:r.suiteHash??null,policyPassed:r.policy.every(check=>check.passed),tests:r.tests.map(t=>({id:t.id,name:t.name,status:t.status,durationMs:t.durationMs,detail:String(t.detail).slice(0,2000)})),elapsedMs:Date.now()-started};};
const before=await run(baseline);const after=await run(candidate);
process.stdout.write(JSON.stringify({schemaVersion:1,kind:"generated_regression",frozenCasesNotLoaded:frozenCases,before,after})+"\\n");
`;
export const generatedTestHarnessHash=sha256(generatedTestHarness);
const side=z.object({stage:z.enum(["policy_rejected","compile_failed","evaluated"]),sourceHash:z.string().nullable(),runnerHash:z.string().nullable(),policyPassed:z.boolean(),tests:z.array(z.object({id:z.string(),name:z.string(),status:z.enum(["pass","fail"]),durationMs:z.number().nonnegative(),detail:z.string()})).max(4),elapsedMs:z.number().nonnegative()});
const outputSchema=z.object({schemaVersion:z.literal(1),kind:z.literal("generated_regression"),frozenCasesNotLoaded:z.number().int(),before:side,after:side});
export type GeneratedTestSide="pass"|"fail"|"not_reached";
export interface GeneratedTestExecution {
  schemaVersion:1;specHash:string;harnessHash:string;baseHash:string;candidateHash:string;
  before:GeneratedTestSide;after:GeneratedTestSide;beforeDetail:string;afterDetail:string;beforeDurationMs:number;afterDurationMs:number;
  /** True only when the same case failed on the faulty baseline and passed on the candidate in one isolated execution. */
  established:boolean;raw:z.infer<typeof outputSchema>;runnerReceipt:Record<string,unknown>;
}
function parse(stdout:string,baseline:string,candidate:string){
  let output:z.infer<typeof outputSchema>;
  try{output=outputSchema.parse(JSON.parse(stdout));}catch{throw new LabError("GENERATED_TEST_OUTPUT_INVALID","The isolated runner did not return a bounded generated-test record.",422);}
  for(const [row,source] of [[output.before,baseline],[output.after,candidate]] as const)if(row.stage==="evaluated"&&row.sourceHash!==sha256(source))throw new LabError("REPAIR_PROOF_IDENTITY","The generated-test result does not bind the exact baseline and candidate.",422);
  return output;
}
function summarize(output:z.infer<typeof outputSchema>,test:GeneratedRegressionTest,runnerReceipt:Record<string,unknown>):GeneratedTestExecution{
  const read=(row:z.infer<typeof side>)=>{const found=row.stage==="evaluated"?row.tests.find(item=>item.id==="generated"):undefined;return found?{status:found.status as GeneratedTestSide,detail:found.detail,durationMs:found.durationMs}:{status:"not_reached" as const,detail:row.stage==="compile_failed"?"The source did not compile, so the generated case was not reached.":"The source was rejected by policy before execution.",durationMs:0};};
  const before=read(output.before),after=read(output.after);
  return {schemaVersion:1,specHash:test.specHash,harnessHash:generatedTestHarnessHash,baseHash:test.baseHash,candidateHash:test.candidateHash,before:before.status,after:after.status,beforeDetail:before.detail,afterDetail:after.detail,beforeDurationMs:before.durationMs,afterDurationMs:after.durationMs,established:before.status==="fail"&&after.status==="pass",raw:output,runnerReceipt};
}
function prepare(test:GeneratedRegressionTest,baseline:string,candidate:string){
  const spec=generatedTestSchema.parse(test.spec);
  if(generatedTestHash(spec)!==test.specHash||sha256(baseline)!==test.baseHash||sha256(candidate)!==test.candidateHash)throw new LabError("GENERATED_TEST_IDENTITY","The generated test does not match its saved baseline, candidate or specification.",409);
  if([baseline,candidate].some(source=>inspectCandidate(source).some(check=>!check.passed)))throw new LabError("GENERATED_TEST_POLICY","A source failed the candidate policy; the generated test was not executed.",422);
  return JSON.stringify({baseline,candidate,test:runnerCase(spec)});
}
export type GeneratedTestRunner=(test:GeneratedRegressionTest,baseline:string,candidate:string,signal?:AbortSignal)=>Promise<GeneratedTestExecution>;
export const runIsolatedGeneratedTest:GeneratedTestRunner=async(test,baseline,candidate,signal)=>{
  const {output,runnerReceipt}=await runIsolatedContainer(prepare(test,baseline,candidate),signal,["--import","tsx","--input-type=module","-e",generatedTestHarness]);
  return summarize(parse(output,baseline,candidate),test,runnerReceipt);
};
export const runCloudGeneratedTest=(credentials?:CloudCredentials):GeneratedTestRunner=>async(test,baseline,candidate,signal)=>{
  const {output,runnerReceipt}=await runCloudSandbox(prepare(test,baseline,candidate),signal,credentials,generatedTestHarness,stdout=>parse(stdout,baseline,candidate));
  const {isolation:_isolation,...raw}=output as typeof output&{isolation?:unknown};
  return summarize(raw as z.infer<typeof outputSchema>,test,runnerReceipt);
};
