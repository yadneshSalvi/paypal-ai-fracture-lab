import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrderApplicationContextUserAction: {
    readonly Continue: "CONTINUE";
    readonly PayNow: "PAY_NOW";
};
export type OrderApplicationContextUserAction = (typeof OrderApplicationContextUserAction)[keyof typeof OrderApplicationContextUserAction] | (string & {});
export declare const orderApplicationContextUserActionSchema: EnumSchema<OrderApplicationContextUserAction>;
