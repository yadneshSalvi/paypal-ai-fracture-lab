import type { Schema } from "../core/validation/schema.js";
export type Customer = {
    id?: string;
    merchantCustomerId?: string;
};
export declare const customerSchema: Schema<Customer>;
