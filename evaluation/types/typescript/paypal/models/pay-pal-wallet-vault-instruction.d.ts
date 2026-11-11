import type { Schema } from "../core/validation/schema.js";
import { PayPalPaymentTokenCustomerType } from "./pay-pal-payment-token-customer-type.js";
import { type PayPalPaymentTokenUsageType } from "./pay-pal-payment-token-usage-type.js";
import { type StoreInVaultInstruction } from "./store-in-vault-instruction.js";
import { type UsagePattern } from "./usage-pattern.js";
export type PayPalWalletVaultInstruction = {
    storeInVault?: StoreInVaultInstruction;
    description?: string;
    usagePattern?: UsagePattern;
    usageType: PayPalPaymentTokenUsageType;
    customerType?: PayPalPaymentTokenCustomerType;
    permitMultiplePaymentTokens?: boolean;
};
export declare const payPalWalletVaultInstructionSchema: Schema<PayPalWalletVaultInstruction>;
