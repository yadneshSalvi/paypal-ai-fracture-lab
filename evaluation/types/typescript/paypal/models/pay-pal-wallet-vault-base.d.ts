import type { Schema } from "../core/validation/schema.js";
import { PayPalPaymentTokenCustomerType } from "./pay-pal-payment-token-customer-type.js";
import { type StoreInVaultInstruction } from "./store-in-vault-instruction.js";
import { type UsagePattern } from "./usage-pattern.js";
import { type UsageType } from "./usage-type.js";
export type PayPalWalletVaultBase = {
    storeInVault?: StoreInVaultInstruction;
    description?: string;
    usagePattern?: UsagePattern;
    usageType?: UsageType;
    customerType?: PayPalPaymentTokenCustomerType;
    permitMultiplePaymentTokens?: boolean;
};
export declare const payPalWalletVaultBaseSchema: Schema<PayPalWalletVaultBase>;
