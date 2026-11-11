import type { Schema } from "../core/validation/schema.js";
import { type VenmoWalletCustomerInformation } from "./venmo-wallet-customer-information.js";
import { type VenmoWalletVaultAttributes } from "./venmo-wallet-vault-attributes.js";
export type VenmoWalletAdditionalAttributes = {
    customer?: VenmoWalletCustomerInformation;
    vault?: VenmoWalletVaultAttributes;
};
export declare const venmoWalletAdditionalAttributesSchema: Schema<VenmoWalletAdditionalAttributes>;
