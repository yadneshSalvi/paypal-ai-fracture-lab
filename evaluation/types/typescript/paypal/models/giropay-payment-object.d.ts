import type { Schema } from "../core/validation/schema.js";
export type GiropayPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
};
export declare const giropayPaymentObjectSchema: Schema<GiropayPaymentObject>;
