import type { Schema } from "../core/validation/schema.js";
export type PayerName = {
    prefix?: string;
    givenName?: string;
    surname?: string;
    middleName?: string;
    suffix?: string;
    alternateFullName?: string;
    fullName?: string;
};
export declare const payerNameSchema: Schema<PayerName>;
