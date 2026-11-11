import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PricingTier } from "./pricing-tier.js";
import { type SubscriptionPricingModel } from "./subscription-pricing-model.js";
export type SubscriptionPricingScheme = {
    version?: number;
    fixedPrice?: Money;
    pricingModel?: SubscriptionPricingModel;
    tiers?: PricingTier[];
    createTime?: string;
    updateTime?: string;
};
export declare const subscriptionPricingSchemeSchema: Schema<SubscriptionPricingScheme>;
