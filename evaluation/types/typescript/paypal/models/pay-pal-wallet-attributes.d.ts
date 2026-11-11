import type { Schema } from "../core/validation/schema.js";
import { type PayPalWalletCustomerRequest } from "./pay-pal-wallet-customer-request.js";
import { type PayPalWalletVaultInstruction } from "./pay-pal-wallet-vault-instruction.js";
export type PayPalWalletAttributes = {
    customer?: PayPalWalletCustomerRequest;
    vault?: PayPalWalletVaultInstruction;
};
export declare const payPalWalletAttributesSchema: Schema<PayPalWalletAttributes>;
