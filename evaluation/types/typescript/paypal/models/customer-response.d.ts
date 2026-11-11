import type { Schema } from "../core/validation/schema.js";
export type CustomerResponse = {
    id?: string;
    merchantCustomerId?: string;
};
export declare const customerResponseSchema: Schema<CustomerResponse>;
