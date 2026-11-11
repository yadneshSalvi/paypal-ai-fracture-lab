import type { EnumSchema } from "../core/validation/schema.js";
export declare const PaymentTokenStatus: {
    readonly Created: "CREATED";
    readonly PayerActionRequired: "PAYER_ACTION_REQUIRED";
    readonly Approved: "APPROVED";
    readonly Vaulted: "VAULTED";
    readonly Tokenized: "TOKENIZED";
};
export type PaymentTokenStatus = (typeof PaymentTokenStatus)[keyof typeof PaymentTokenStatus] | (string & {});
export declare const paymentTokenStatusSchema: EnumSchema<PaymentTokenStatus>;
