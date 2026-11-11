import type { Schema } from "../core/validation/schema.js";
import { type PayPalPaymentTokenCustomerType } from "./pay-pal-payment-token-customer-type.js";
import { type PayPalPaymentTokenUsageType } from "./pay-pal-payment-token-usage-type.js";
import { type Plan } from "./plan.js";
import { type UsagePattern } from "./usage-pattern.js";
import { type VaultExperienceContext } from "./vault-experience-context.js";
import { type VaultedDigitalWalletShippingDetails } from "./vaulted-digital-wallet-shipping-details.js";
export type VaultPayPalWalletRequest = {
    description?: string;
    usagePattern?: UsagePattern;
    shipping?: VaultedDigitalWalletShippingDetails;
    permitMultiplePaymentTokens?: boolean;
    usageType?: PayPalPaymentTokenUsageType;
    customerType?: PayPalPaymentTokenCustomerType;
    billingPlan?: Plan;
    experienceContext?: VaultExperienceContext;
};
export declare const vaultPayPalWalletRequestSchema: Schema<VaultPayPalWalletRequest>;
