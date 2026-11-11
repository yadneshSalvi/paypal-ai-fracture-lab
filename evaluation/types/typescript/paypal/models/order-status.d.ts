import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrderStatus: {
    readonly Created: "CREATED";
    readonly Saved: "SAVED";
    readonly Approved: "APPROVED";
    readonly Voided: "VOIDED";
    readonly Completed: "COMPLETED";
    readonly PayerActionRequired: "PAYER_ACTION_REQUIRED";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus] | (string & {});
export declare const orderStatusSchema: EnumSchema<OrderStatus>;
