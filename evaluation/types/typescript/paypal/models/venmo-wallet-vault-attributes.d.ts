import type { Schema } from "../core/validation/schema.js";
import { type StoreInVaultInstruction } from "./store-in-vault-instruction.js";
import { VenmoPaymentTokenCustomerType } from "./venmo-payment-token-customer-type.js";
import { type VenmoPaymentTokenUsagePattern } from "./venmo-payment-token-usage-pattern.js";
import { type VenmoPaymentTokenUsageType } from "./venmo-payment-token-usage-type.js";
export type VenmoWalletVaultAttributes = {
    storeInVault: StoreInVaultInstruction;
    description?: string;
    usagePattern?: VenmoPaymentTokenUsagePattern;
    usageType: VenmoPaymentTokenUsageType;
    customerType?: VenmoPaymentTokenCustomerType;
    permitMultiplePaymentTokens?: boolean;
};
export declare const venmoWalletVaultAttributesSchema: Schema<VenmoWalletVaultAttributes>;
