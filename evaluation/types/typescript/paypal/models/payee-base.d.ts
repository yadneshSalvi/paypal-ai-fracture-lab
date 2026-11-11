import type { Schema } from "../core/validation/schema.js";
export type PayeeBase = {
    emailAddress?: string;
    merchantId?: string;
};
export declare const payeeBaseSchema: Schema<PayeeBase>;
