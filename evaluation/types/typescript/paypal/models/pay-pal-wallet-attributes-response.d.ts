import type { Schema } from "../core/validation/schema.js";
import { type CobrandedCard } from "./cobranded-card.js";
import { type PayPalWalletVaultResponse } from "./pay-pal-wallet-vault-response.js";
export type PayPalWalletAttributesResponse = {
    vault?: PayPalWalletVaultResponse;
    cobrandedCards?: CobrandedCard[];
};
export declare const payPalWalletAttributesResponseSchema: Schema<PayPalWalletAttributesResponse>;
