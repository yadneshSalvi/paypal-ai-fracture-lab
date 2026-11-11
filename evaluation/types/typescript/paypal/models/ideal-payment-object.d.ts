import type { Schema } from "../core/validation/schema.js";
export type IDealPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
    ibanLastChars?: string;
};
export declare const iDealPaymentObjectSchema: Schema<IDealPaymentObject>;
