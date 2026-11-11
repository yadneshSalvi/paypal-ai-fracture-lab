import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PricingModel } from "./pricing-model.js";
export type PricingScheme = {
    price?: Money;
    pricingModel: PricingModel;
    reloadThresholdAmount?: Money;
};
export declare const pricingSchemeSchema: Schema<PricingScheme>;
