import type { Schema } from "../core/validation/schema.js";
export type PayerBase = {
    emailAddress?: string;
    payerId?: string;
};
export declare const payerBaseSchema: Schema<PayerBase>;
