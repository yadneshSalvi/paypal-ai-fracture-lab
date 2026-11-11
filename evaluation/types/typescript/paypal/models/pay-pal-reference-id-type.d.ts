import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalReferenceIdType: {
    readonly Odr: "ODR";
    readonly Txn: "TXN";
    readonly Sub: "SUB";
    readonly Pap: "PAP";
};
export type PayPalReferenceIdType = (typeof PayPalReferenceIdType)[keyof typeof PayPalReferenceIdType] | (string & {});
export declare const payPalReferenceIdTypeSchema: EnumSchema<PayPalReferenceIdType>;
