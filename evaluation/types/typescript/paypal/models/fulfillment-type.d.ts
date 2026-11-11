import type { EnumSchema } from "../core/validation/schema.js";
export declare const FulfillmentType: {
    readonly Shipping: "SHIPPING";
    readonly PickupInPerson: "PICKUP_IN_PERSON";
    readonly PickupInStore: "PICKUP_IN_STORE";
    readonly PickupFromPerson: "PICKUP_FROM_PERSON";
};
export type FulfillmentType = (typeof FulfillmentType)[keyof typeof FulfillmentType] | (string & {});
export declare const fulfillmentTypeSchema: EnumSchema<FulfillmentType>;
