import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type PricingTier = {
    startingQuantity: string;
    endingQuantity?: string;
    amount: Money;
};
export declare const pricingTierSchema: Schema<PricingTier>;
