import type { Schema } from "../core/validation/schema.js";
export type SofortPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
    ibanLastChars?: string;
};
export declare const sofortPaymentObjectSchema: Schema<SofortPaymentObject>;
