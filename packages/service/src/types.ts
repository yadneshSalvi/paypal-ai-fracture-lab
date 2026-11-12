import type { KnowledgeProjection, Lane, Provenance, Revision, RunDTO, SourceRef, TraceEventDTO } from "@fracture/contracts";
import type { MinorMoney, ProviderResource } from "@fracture/paypal-core";
import type { FaultRecipe } from "../../contracts/src/campaign-lab";
import type { CampaignExecutionScope } from "../../campaigns/src/gate";

export interface LabSession {id:string;createdAt:string;expiresAt:string;role:"judge"|"owner";selectedRunId:string|null;seeded:boolean}
export interface RunRow extends Record<string,unknown> {id:string;session_id:string;checkpoint:string;stage:string;input_hash:string;cancelled:number;document:string;version:number}
export interface RunInput {projectId:string;scenarioId:string;revision:Revision;mode:Provenance;seed:string;requestId:string;interactive:boolean;campaign?:CampaignExecutionScope;executionRecipe?:FaultRecipe}
export interface FixtureResource extends ProviderResource {intentId:string;approved:boolean;createdAt:string;capturedMinor:number;refundedMinor:number;providerRequestId:string|null;wireAmount:{currency_code:string;value:string}}
export interface TargetState {intentId:string;orderIds:string[];status:"unpaid"|"processing"|"failed"|"checking"|"paid"|"refunded";lastCaptureId:string|null;attempt:number;fulfillmentCount:number;unknown:boolean}
export interface EventInput {lane:Lane;kind:string;title:string;detail:string;identity?:TraceEventDTO["identity"];resourceId?:string;requestId?:string;sourceRef?:SourceRef;facts?:Record<string,unknown>;projection?:Partial<KnowledgeProjection>}
export interface RunContext {run:RunDTO;sessionId:string;money:MinorMoney;emit:(event:EventInput)=>Promise<void>}
export interface FaultPlan {dropCaptureResponse:boolean;unavailableReread:boolean;authFailure:boolean;malformedSuccess:boolean;capturePending:boolean;policyDenial:boolean;crashAfterCapture:boolean;dropCreateResponse:boolean}
export const noFaults:FaultPlan={dropCaptureResponse:false,unavailableReread:false,authFailure:false,malformedSuccess:false,capturePending:false,policyDenial:false,crashAfterCapture:false,dropCreateResponse:false};
