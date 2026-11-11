import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type VaultCustomer } from "./vault-customer.js";
import { type VaultStatus } from "./vault-status.js";
export type VaultResponse = {
    id?: string;
    status?: VaultStatus;
    customer?: VaultCustomer;
    links?: LinkDescription[];
};
export declare const vaultResponseSchema: Schema<VaultResponse>;
