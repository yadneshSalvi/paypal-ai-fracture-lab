import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type OneTimeCharge = {
    setupFee?: Money;
    shippingAmount?: Money;
    taxes?: Money;
    productPrice?: Money;
    subtotal?: Money;
    totalAmount: Money;
};
export declare const oneTimeChargeSchema: Schema<OneTimeCharge>;
