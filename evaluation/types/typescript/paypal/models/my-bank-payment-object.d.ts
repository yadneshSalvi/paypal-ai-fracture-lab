import type { Schema } from "../core/validation/schema.js";
export type MyBankPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
    ibanLastChars?: string;
};
export declare const myBankPaymentObjectSchema: Schema<MyBankPaymentObject>;
