import type { Schema } from "../core/validation/schema.js";
import { type PricingScheme } from "./pricing-scheme.js";
import { type TenureType } from "./tenure-type.js";
export type BillingCycle = {
    tenureType: TenureType;
    pricingScheme?: PricingScheme;
    totalCycles?: number;
    sequence?: number;
    startDate?: string;
};
export declare const billingCycleSchema: Schema<BillingCycle>;
