import type { Schema } from "../core/validation/schema.js";
import { type PayPalPaymentTokenCustomerType } from "./pay-pal-payment-token-customer-type.js";
import { type PayPalPaymentTokenUsageType } from "./pay-pal-payment-token-usage-type.js";
import { type UsagePattern } from "./usage-pattern.js";
import { type VaultedDigitalWalletShippingDetails } from "./vaulted-digital-wallet-shipping-details.js";
export type VaultedDigitalWallet = {
    description?: string;
    usagePattern?: UsagePattern;
    shipping?: VaultedDigitalWalletShippingDetails;
    permitMultiplePaymentTokens?: boolean;
    usageType?: PayPalPaymentTokenUsageType;
    customerType?: PayPalPaymentTokenCustomerType;
};
export declare const vaultedDigitalWalletSchema: Schema<VaultedDigitalWallet>;
