import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoPaymentTokenCustomerType: {
    readonly Consumer: "CONSUMER";
    readonly Business: "BUSINESS";
};
export type VenmoPaymentTokenCustomerType = (typeof VenmoPaymentTokenCustomerType)[keyof typeof VenmoPaymentTokenCustomerType] | (string & {});
export declare const venmoPaymentTokenCustomerTypeSchema: EnumSchema<VenmoPaymentTokenCustomerType>;
