import type { EnumSchema } from "../core/validation/schema.js";
export declare const ShippingType: {
    readonly Shipping: "SHIPPING";
    readonly Pickup: "PICKUP";
    readonly PickupInStore: "PICKUP_IN_STORE";
    readonly PickupFromPerson: "PICKUP_FROM_PERSON";
};
export type ShippingType = (typeof ShippingType)[keyof typeof ShippingType] | (string & {});
export declare const shippingTypeSchema: EnumSchema<ShippingType>;
