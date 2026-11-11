import type { Schema } from "../core/validation/schema.js";
import { type Frequency } from "./frequency.js";
import { type SubscriptionPricingScheme } from "./subscription-pricing-scheme.js";
import { type TenureType } from "./tenure-type.js";
export type SubscriptionBillingCycle = {
    pricingScheme?: SubscriptionPricingScheme;
    frequency: Frequency;
    tenureType: TenureType;
    sequence: number;
    totalCycles?: number;
};
export declare const subscriptionBillingCycleSchema: Schema<SubscriptionBillingCycle>;
