import type { Schema } from "../core/validation/schema.js";
export type P24PaymentObject = {
    name?: string;
    email?: string;
    countryCode?: string;
    paymentDescriptor?: string;
    methodId?: string;
    methodDescription?: string;
};
export declare const p24PaymentObjectSchema: Schema<P24PaymentObject>;
