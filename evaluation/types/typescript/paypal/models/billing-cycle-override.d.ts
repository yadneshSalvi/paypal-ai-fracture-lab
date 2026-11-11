import type { Schema } from "../core/validation/schema.js";
import { type SubscriptionPricingScheme } from "./subscription-pricing-scheme.js";
export type BillingCycleOverride = {
    pricingScheme?: SubscriptionPricingScheme;
    sequence: number;
    totalCycles?: number;
};
export declare const billingCycleOverrideSchema: Schema<BillingCycleOverride>;
