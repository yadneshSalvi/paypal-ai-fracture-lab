import type { Schema } from "../core/validation/schema.js";
import { type CardCustomerInformation } from "./card-customer-information.js";
import { type LinkDescription } from "./link-description.js";
import { type VaultStatus } from "./vault-status.js";
export type CardVaultResponse = {
    id?: string;
    status?: VaultStatus;
    links?: LinkDescription[];
    customer?: CardCustomerInformation;
};
export declare const cardVaultResponseSchema: Schema<CardVaultResponse>;
