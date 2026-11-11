import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalWalletVaultStatus: {
    readonly Vaulted: "VAULTED";
    readonly Created: "CREATED";
    readonly Approved: "APPROVED";
};
export type PayPalWalletVaultStatus = (typeof PayPalWalletVaultStatus)[keyof typeof PayPalWalletVaultStatus] | (string & {});
export declare const payPalWalletVaultStatusSchema: EnumSchema<PayPalWalletVaultStatus>;
