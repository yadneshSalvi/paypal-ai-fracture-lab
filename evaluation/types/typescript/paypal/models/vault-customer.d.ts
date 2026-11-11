import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
export type VaultCustomer = {
    id?: string;
    name?: Name;
};
export declare const vaultCustomerSchema: Schema<VaultCustomer>;
