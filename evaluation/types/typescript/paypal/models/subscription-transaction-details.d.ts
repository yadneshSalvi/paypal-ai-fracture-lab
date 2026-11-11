import type { Schema } from "../core/validation/schema.js";
import { type CaptureStatus } from "./capture-status.js";
import { type SubscriptionAmountWithBreakdown } from "./subscription-amount-with-breakdown.js";
import { type SubscriptionPayerName } from "./subscription-payer-name.js";
export type SubscriptionTransactionDetails = {
    status?: CaptureStatus;
    id: string;
    amountWithBreakdown: SubscriptionAmountWithBreakdown;
    payerName?: SubscriptionPayerName;
    payerEmail?: string;
    time: string;
};
export declare const subscriptionTransactionDetailsSchema: Schema<SubscriptionTransactionDetails>;
