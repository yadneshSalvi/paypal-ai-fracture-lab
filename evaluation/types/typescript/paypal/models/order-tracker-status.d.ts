import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrderTrackerStatus: {
    readonly Cancelled: "CANCELLED";
    readonly Shipped: "SHIPPED";
};
export type OrderTrackerStatus = (typeof OrderTrackerStatus)[keyof typeof OrderTrackerStatus] | (string & {});
export declare const orderTrackerStatusSchema: EnumSchema<OrderTrackerStatus>;
