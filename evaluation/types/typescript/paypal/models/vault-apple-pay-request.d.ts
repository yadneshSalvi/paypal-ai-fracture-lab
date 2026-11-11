import type { Schema } from "../core/validation/schema.js";
import { type ApplePayRequestCard } from "./apple-pay-request-card.js";
export type VaultApplePayRequest = {
    token?: string;
    card?: ApplePayRequestCard;
};
export declare const vaultApplePayRequestSchema: Schema<VaultApplePayRequest>;
