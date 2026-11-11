import type { EnumSchema } from "../core/validation/schema.js";
export declare const CallbackEvents: {
    readonly ShippingAddress: "SHIPPING_ADDRESS";
    readonly ShippingOptions: "SHIPPING_OPTIONS";
};
export type CallbackEvents = (typeof CallbackEvents)[keyof typeof CallbackEvents] | (string & {});
export declare const callbackEventsSchema: EnumSchema<CallbackEvents>;
