import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalWalletContextShippingPreference: {
    readonly GetFromFile: "GET_FROM_FILE";
    readonly NoShipping: "NO_SHIPPING";
    readonly SetProvidedAddress: "SET_PROVIDED_ADDRESS";
};
export type PayPalWalletContextShippingPreference = (typeof PayPalWalletContextShippingPreference)[keyof typeof PayPalWalletContextShippingPreference] | (string & {});
export declare const payPalWalletContextShippingPreferenceSchema: EnumSchema<PayPalWalletContextShippingPreference>;
