import type { EnumSchema } from "../core/validation/schema.js";
export declare const ExperienceContextShippingPreference: {
    readonly GetFromFile: "GET_FROM_FILE";
    readonly NoShipping: "NO_SHIPPING";
    readonly SetProvidedAddress: "SET_PROVIDED_ADDRESS";
};
export type ExperienceContextShippingPreference = (typeof ExperienceContextShippingPreference)[keyof typeof ExperienceContextShippingPreference] | (string & {});
export declare const experienceContextShippingPreferenceSchema: EnumSchema<ExperienceContextShippingPreference>;
