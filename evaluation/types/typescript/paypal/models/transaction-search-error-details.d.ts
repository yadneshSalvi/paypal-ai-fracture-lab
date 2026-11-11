import type { Schema } from "../core/validation/schema.js";
export type TransactionSearchErrorDetails = {
    field?: string;
    value?: string;
    location?: string;
    issue: string;
    description?: string;
};
export declare const transactionSearchErrorDetailsSchema: Schema<TransactionSearchErrorDetails>;
