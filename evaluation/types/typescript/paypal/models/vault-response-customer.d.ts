import type { Schema } from "../core/validation/schema.js";
export type VaultResponseCustomer = {
    id?: string;
    merchantCustomerId?: string;
    links?: Record<string, unknown>[];
};
export declare const vaultResponseCustomerSchema: Schema<VaultResponseCustomer>;
