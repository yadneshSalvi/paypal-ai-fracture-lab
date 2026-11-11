import type { Schema } from "../core/validation/schema.js";
import { type BillingCycle } from "./billing-cycle.js";
import { type OneTimeCharge } from "./one-time-charge.js";
export type Plan = {
    billingCycles: BillingCycle[];
    oneTimeCharges: OneTimeCharge;
    name?: string;
};
export declare const planSchema: Schema<Plan>;
