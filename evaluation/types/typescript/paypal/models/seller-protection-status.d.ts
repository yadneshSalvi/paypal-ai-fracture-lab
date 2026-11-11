import type { EnumSchema } from "../core/validation/schema.js";
export declare const SellerProtectionStatus: {
    readonly Eligible: "ELIGIBLE";
    readonly PartiallyEligible: "PARTIALLY_ELIGIBLE";
    readonly NotEligible: "NOT_ELIGIBLE";
};
export type SellerProtectionStatus = (typeof SellerProtectionStatus)[keyof typeof SellerProtectionStatus] | (string & {});
export declare const sellerProtectionStatusSchema: EnumSchema<SellerProtectionStatus>;
