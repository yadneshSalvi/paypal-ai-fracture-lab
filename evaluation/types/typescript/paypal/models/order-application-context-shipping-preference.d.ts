import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrderApplicationContextShippingPreference: {
    readonly GetFromFile: "GET_FROM_FILE";
    readonly NoShipping: "NO_SHIPPING";
    readonly SetProvidedAddress: "SET_PROVIDED_ADDRESS";
};
export type OrderApplicationContextShippingPreference = (typeof OrderApplicationContextShippingPreference)[keyof typeof OrderApplicationContextShippingPreference] | (string & {});
export declare const orderApplicationContextShippingPreferenceSchema: EnumSchema<OrderApplicationContextShippingPreference>;
