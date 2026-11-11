import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type AmountBreakdown = {
    itemTotal?: Money;
    shipping?: Money;
    handling?: Money;
    taxTotal?: Money;
    insurance?: Money;
    shippingDiscount?: Money;
    discount?: Money;
};
export declare const amountBreakdownSchema: Schema<AmountBreakdown>;
