import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalWalletContactPreference: {
    readonly NoContactInfo: "NO_CONTACT_INFO";
    readonly UpdateContactInfo: "UPDATE_CONTACT_INFO";
    readonly RetainContactInfo: "RETAIN_CONTACT_INFO";
};
export type PayPalWalletContactPreference = (typeof PayPalWalletContactPreference)[keyof typeof PayPalWalletContactPreference] | (string & {});
export declare const payPalWalletContactPreferenceSchema: EnumSchema<PayPalWalletContactPreference>;
