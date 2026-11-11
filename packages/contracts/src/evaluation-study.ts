import type {Protocol} from '../../evaluation/src/protocol';
import type {Grade,summarize} from '../../evaluation/src/results';

export type StudyArm='A'|'B'|'C';
export type StudySplit='development'|'held_out';
export interface StudyTask {
  taskId:string;title:string;family:string;language:'TypeScript'|'Python';split:StudySplit;
  qualified:boolean;baselineHash:string;goldenHash:string;checks:number;publicCases:number;hiddenCases:number;
  controlProof:{path:string;sha256:string};
}
export interface StudyAttempt {
  candidateId:string;taskId:string;title:string;family:string;language:string;model:string;arm:StudyArm;repeat:number;split:StudySplit;
  passed:boolean|null;status:Grade['stage'];compilePassed:boolean|null;policyPassed:boolean|null;hiddenPassed:boolean|null;
  tests:Grade['tests'];sourceHash:string|null;providerReceiptHash:string|null;runnerReceiptHash:string|null;errorCode:string|null;
  attemptNumber:number;history:Grade[];inputTokens:number;outputTokens:number;reasoningTokens:number;totalTokens:number;
  toolCalls:number;providerRequests:number;estimatedCostUsd:number;unpricedCalls:number;durationMs:number;evidencePath:string;
}
export interface StudyReport extends ReturnType<typeof summarize> {
  id:string;status:'sealed';dataScope:'executed_model_offline_sdk';livePaymentOperations:0;sealedAt:string;sealHash:string;
  sourceCommit:string;evaluatorHash:string;imageId:string;models:Protocol['models'];contexts:Protocol['contexts'];
  tasks:StudyTask[];execution:Protocol['execution'];maximumOutputTokens:number;statistics:Protocol['statistics'];
  receiptCounts:{planned:number;recordedCandidates:number;missing:number;attemptRecords:number;retries:number;modelGenerations:number;providerRequests:number;providerResponseRecords:number;unansweredDispatches:number};
  usage:{inputTokens:number;outputTokens:number;reasoningTokens:number;totalTokens:number;estimatedCostUsd:number;unpricedCalls:number;costLabel:string};
  rows:StudyAttempt[];
}
export interface StudyPublication {
  id:string;phase:'protocol_frozen'|'running'|'sealed';protocolHash:string;sourceCommit:string;evaluatorHash:string;imageId:string;
  frozenAt:string;updatedAt:string;planned:number;heldOutPlanned:number;recordedCandidates:number;gradedCandidates:number;infrastructureCandidates:number;
  models:Protocol['models'];contexts:Protocol['contexts'];tasks:StudyTask[];execution:Protocol['execution'];maximumOutputTokens:number;
  statistics:Protocol['statistics'];limitations:string[];artifactBase:string;report:StudyReport|null;
  qualification:{hardenedControls:number;faultyControls:number;invariantChecks:number;safetyProbes:number;anonymousLanguages:number};
}
export interface StudyTaskEvidence {
  task:StudyTask;protocolHash:string;prompt:string;baseline:string;golden:string|null;
  controls:Array<{control:string;sourceHash:string;compilePassed:boolean;policyPassed:boolean;hiddenPassed:boolean;checks:Array<{id:string;passed:boolean;detail:string}>;receiptHash:string}>;
  hiddenChecksReleased:boolean;
}
export interface CandidateEvidence {
  schemaVersion:1;studyId:string;candidateId:string;taskId:string;protocolHash:string;dataScope:'executed_model_offline_sdk';privateReasoningIncluded:false;
  history:Array<{grade:Grade;generation:{status:string;source:string|null;summary:string|null;errorCode:string|null;provider:string;model:string;receiptHash:string;sourceHash:string|null;calls:Array<{index:number;responseId:string|null;reportedModel:string|null;status:string|null;http:{requestId:string|null;httpStatus:number|null;durationMs:number;requestHash:string;responseHash:string|null;errorCode:string|null};usage:{inputTokens:number;outputTokens:number;reasoningTokens:number;totalTokens:number}|null;estimatedCostUsd:number|null}>;toolAccesses:Array<{index:number;name:string;arguments:unknown;result:unknown}>};runner:{kind:string;receiptHash:string;diagnostic?:string;result?:{compilePassed:boolean;policyPassed:boolean;hiddenPassed:boolean;diagnostics:string;policy:{passed:boolean;findings:Array<{code:string;message?:string;line?:number}>};tests:Array<{id:string;passed:boolean}>;cases:Array<{id:string;visibility:string;checks:Array<{id:string;passed:boolean;message?:string;detail?:string}>;observation:{orders:unknown[];captures:unknown[];refunds:unknown[];rows:unknown[];observations:Array<{sequence:number;actor:string;kind:string;input:unknown;result:unknown}>}}>;isolation:Record<string,unknown>;receiptHash:string}}|null}>;
}
