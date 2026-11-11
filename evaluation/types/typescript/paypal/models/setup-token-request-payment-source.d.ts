import type { Schema } from "../core/validation/schema.js";
import { type BankRequest } from "./bank-request.js";
import { type SetupTokenRequestCard } from "./setup-token-request-card.js";
import { type VaultApplePayRequest } from "./vault-apple-pay-request.js";
import { type VaultPayPalWalletRequest } from "./vault-pay-pal-wallet-request.js";
import { type VaultTokenRequest } from "./vault-token-request.js";
import { type VaultVenmoRequest } from "./vault-venmo-request.js";
export type SetupTokenRequestPaymentSource = {
    card?: SetupTokenRequestCard;
    paypal?: VaultPayPalWalletRequest;
    venmo?: VaultVenmoRequest;
    applePay?: VaultApplePayRequest;
    token?: VaultTokenRequest;
    bank?: BankRequest;
};
export declare const setupTokenRequestPaymentSourceSchema: Schema<SetupTokenRequestPaymentSource>;
