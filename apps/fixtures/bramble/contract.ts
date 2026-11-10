import type { RunDTO } from "@fracture/contracts";
import type { LabStore } from "../../../packages/service/src/store";
import type { LocalPayPalTransport } from "../../../packages/runner/src/local-provider";
export interface BrambleContext {run:RunDTO;sessionId:string;store:LabStore;transport:LocalPayPalTransport}
export interface WireOrder {id:string;status:string;purchase_units?:{payments?:{captures?:{id:string;status:string;amount?:{currency_code:string;value:string}}[]}}[]}
export class FixtureRefusal extends Error {constructor(readonly status:number){super(`Sample request refused (${status}).`);}}
