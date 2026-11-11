import type { EnumSchema } from "../core/validation/schema.js";
export declare const PricingModel: {
    readonly Fixed: "FIXED";
    readonly Variable: "VARIABLE";
    readonly AutoReload: "AUTO_RELOAD";
};
export type PricingModel = (typeof PricingModel)[keyof typeof PricingModel] | (string & {});
export declare const pricingModelSchema: EnumSchema<PricingModel>;
