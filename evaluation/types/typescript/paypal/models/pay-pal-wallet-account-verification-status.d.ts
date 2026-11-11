import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalWalletAccountVerificationStatus: {
    readonly Verified: "VERIFIED";
    readonly Unverified: "UNVERIFIED";
};
export type PayPalWalletAccountVerificationStatus = (typeof PayPalWalletAccountVerificationStatus)[keyof typeof PayPalWalletAccountVerificationStatus] | (string & {});
export declare const payPalWalletAccountVerificationStatusSchema: EnumSchema<PayPalWalletAccountVerificationStatus>;
