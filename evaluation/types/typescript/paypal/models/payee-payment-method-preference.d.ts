import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayeePaymentMethodPreference: {
    readonly Unrestricted: "UNRESTRICTED";
    readonly ImmediatePaymentRequired: "IMMEDIATE_PAYMENT_REQUIRED";
};
export type PayeePaymentMethodPreference = (typeof PayeePaymentMethodPreference)[keyof typeof PayeePaymentMethodPreference] | (string & {});
export declare const payeePaymentMethodPreferenceSchema: EnumSchema<PayeePaymentMethodPreference>;
