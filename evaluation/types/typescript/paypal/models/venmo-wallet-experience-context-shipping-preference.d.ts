import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoWalletExperienceContextShippingPreference: {
    readonly GetFromFile: "GET_FROM_FILE";
    readonly NoShipping: "NO_SHIPPING";
    readonly SetProvidedAddress: "SET_PROVIDED_ADDRESS";
};
export type VenmoWalletExperienceContextShippingPreference = (typeof VenmoWalletExperienceContextShippingPreference)[keyof typeof VenmoWalletExperienceContextShippingPreference] | (string & {});
export declare const venmoWalletExperienceContextShippingPreferenceSchema: EnumSchema<VenmoWalletExperienceContextShippingPreference>;
