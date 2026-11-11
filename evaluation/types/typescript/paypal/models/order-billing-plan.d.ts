import type { Schema } from "../core/validation/schema.js";
import { type BillingCycle } from "./billing-cycle.js";
import { type Money } from "./money.js";
export type OrderBillingPlan = {
    billingCycles: BillingCycle[];
    setupFee?: Money;
    name?: string;
};
export declare const orderBillingPlanSchema: Schema<OrderBillingPlan>;
