import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalPaymentTokenCustomerType: {
    readonly Consumer: "CONSUMER";
    readonly Business: "BUSINESS";
};
export type PayPalPaymentTokenCustomerType = (typeof PayPalPaymentTokenCustomerType)[keyof typeof PayPalPaymentTokenCustomerType] | (string & {});
export declare const payPalPaymentTokenCustomerTypeSchema: EnumSchema<PayPalPaymentTokenCustomerType>;
