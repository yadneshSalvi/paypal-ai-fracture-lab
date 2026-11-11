import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type PayPalWalletCustomer } from "./pay-pal-wallet-customer.js";
import { type PayPalWalletVaultStatus } from "./pay-pal-wallet-vault-status.js";
export type PayPalWalletVaultResponse = {
    id?: string;
    status?: PayPalWalletVaultStatus;
    links?: LinkDescription[];
    customer?: PayPalWalletCustomer;
};
export declare const payPalWalletVaultResponseSchema: Schema<PayPalWalletVaultResponse>;
