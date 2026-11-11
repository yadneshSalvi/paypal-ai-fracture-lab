import type { Schema } from "../core/validation/schema.js";
import { type CardVaultResponse } from "./card-vault-response.js";
export type CardAttributesResponse = {
    vault?: CardVaultResponse;
};
export declare const cardAttributesResponseSchema: Schema<CardAttributesResponse>;
