import type { Schema } from "../core/validation/schema.js";
import { type SubscriptionPricingScheme } from "./subscription-pricing-scheme.js";
export type UpdatePricingScheme = {
    billingCycleSequence: number;
    pricingScheme: SubscriptionPricingScheme;
};
export declare const updatePricingSchemeSchema: Schema<UpdatePricingScheme>;
