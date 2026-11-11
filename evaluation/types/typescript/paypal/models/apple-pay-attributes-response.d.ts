import type { Schema } from "../core/validation/schema.js";
import { type VaultResponse } from "./vault-response.js";
export type ApplePayAttributesResponse = {
    vault?: VaultResponse;
};
export declare const applePayAttributesResponseSchema: Schema<ApplePayAttributesResponse>;
