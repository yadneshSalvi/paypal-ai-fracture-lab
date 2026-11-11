import type { Schema } from "../core/validation/schema.js";
import { type VenmoVaultResponse } from "./venmo-vault-response.js";
export type VenmoWalletAttributesResponse = {
    vault?: VenmoVaultResponse;
};
export declare const venmoWalletAttributesResponseSchema: Schema<VenmoWalletAttributesResponse>;
