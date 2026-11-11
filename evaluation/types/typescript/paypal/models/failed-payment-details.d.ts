import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type ReasonCode } from "./reason-code.js";
export type FailedPaymentDetails = {
    amount: Money;
    time: string;
    reasonCode?: ReasonCode;
    nextPaymentRetryTime?: string;
};
export declare const failedPaymentDetailsSchema: Schema<FailedPaymentDetails>;
