import type { Schema } from "../core/validation/schema.js";
import { type UpdatePricingScheme } from "./update-pricing-scheme.js";
export type UpdatePricingSchemesRequest = {
    pricingSchemes: UpdatePricingScheme[];
};
export declare const updatePricingSchemesRequestSchema: Schema<UpdatePricingSchemesRequest>;
