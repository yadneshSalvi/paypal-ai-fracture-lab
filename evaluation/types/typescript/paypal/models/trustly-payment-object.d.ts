import type { Schema } from "../core/validation/schema.js";
export type TrustlyPaymentObject = {
    name?: string;
    countryCode?: string;
    email?: string;
    bic?: string;
    ibanLastChars?: string;
};
export declare const trustlyPaymentObjectSchema: Schema<TrustlyPaymentObject>;
