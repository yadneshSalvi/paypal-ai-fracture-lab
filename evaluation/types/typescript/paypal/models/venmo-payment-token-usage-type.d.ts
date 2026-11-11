import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoPaymentTokenUsageType: {
    readonly Merchant: "MERCHANT";
    readonly Platform: "PLATFORM";
};
export type VenmoPaymentTokenUsageType = (typeof VenmoPaymentTokenUsageType)[keyof typeof VenmoPaymentTokenUsageType] | (string & {});
export declare const venmoPaymentTokenUsageTypeSchema: EnumSchema<VenmoPaymentTokenUsageType>;
