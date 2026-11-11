import type { Schema } from "../core/validation/schema.js";
import { type PayPalPaymentTokenCustomerType } from "./pay-pal-payment-token-customer-type.js";
import { type PayPalPaymentTokenUsageType } from "./pay-pal-payment-token-usage-type.js";
import { type UsagePattern } from "./usage-pattern.js";
import { type VaultedDigitalWalletShippingDetails } from "./vaulted-digital-wallet-shipping-details.js";
import { type VenmoExperienceContext } from "./venmo-experience-context.js";
export type VaultVenmoRequest = {
    description?: string;
    usagePattern?: UsagePattern;
    shipping?: VaultedDigitalWalletShippingDetails;
    permitMultiplePaymentTokens?: boolean;
    usageType?: PayPalPaymentTokenUsageType;
    customerType?: PayPalPaymentTokenCustomerType;
    experienceContext?: VenmoExperienceContext;
};
export declare const vaultVenmoRequestSchema: Schema<VaultVenmoRequest>;
