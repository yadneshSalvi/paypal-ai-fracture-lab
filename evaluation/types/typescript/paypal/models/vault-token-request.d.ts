import type { Schema } from "../core/validation/schema.js";
import { type VaultTokenRequestType } from "./vault-token-request-type.js";
export type VaultTokenRequest = {
    id: string;
    type: VaultTokenRequestType;
};
export declare const vaultTokenRequestSchema: Schema<VaultTokenRequest>;
