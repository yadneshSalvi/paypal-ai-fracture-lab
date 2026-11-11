import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type RefundPlatformFee = {
    amount: Money;
};
export declare const refundPlatformFeeSchema: Schema<RefundPlatformFee>;
