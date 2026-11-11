import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalPaymentTokenUsageType: {
    readonly Merchant: "MERCHANT";
    readonly Platform: "PLATFORM";
};
export type PayPalPaymentTokenUsageType = (typeof PayPalPaymentTokenUsageType)[keyof typeof PayPalPaymentTokenUsageType] | (string & {});
export declare const payPalPaymentTokenUsageTypeSchema: EnumSchema<PayPalPaymentTokenUsageType>;
