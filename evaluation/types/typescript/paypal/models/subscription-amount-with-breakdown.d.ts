import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type SubscriptionAmountWithBreakdown = {
    grossAmount: Money;
    totalItemAmount?: Money;
    feeAmount?: Money;
    shippingAmount?: Money;
    taxAmount?: Money;
    netAmount?: Money;
};
export declare const subscriptionAmountWithBreakdownSchema: Schema<SubscriptionAmountWithBreakdown>;
