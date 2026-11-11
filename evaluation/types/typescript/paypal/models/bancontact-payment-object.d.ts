import type { Schema } from "../core/validation/schema.js";
export type BancontactPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
    ibanLastChars?: string;
    cardLastDigits?: string;
};
export declare const bancontactPaymentObjectSchema: Schema<BancontactPaymentObject>;
