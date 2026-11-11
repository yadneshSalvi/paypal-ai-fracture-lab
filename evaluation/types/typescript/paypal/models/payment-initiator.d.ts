import type { EnumSchema } from "../core/validation/schema.js";
export declare const PaymentInitiator: {
    readonly Customer: "CUSTOMER";
    readonly Merchant: "MERCHANT";
};
export type PaymentInitiator = (typeof PaymentInitiator)[keyof typeof PaymentInitiator] | (string & {});
export declare const paymentInitiatorSchema: EnumSchema<PaymentInitiator>;
