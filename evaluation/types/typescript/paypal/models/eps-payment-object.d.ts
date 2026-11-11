import type { Schema } from "../core/validation/schema.js";
export type EpsPaymentObject = {
    name?: string;
    countryCode?: string;
    bic?: string;
};
export declare const epsPaymentObjectSchema: Schema<EpsPaymentObject>;
