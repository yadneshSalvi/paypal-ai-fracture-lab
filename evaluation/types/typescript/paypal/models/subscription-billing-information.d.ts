import type { Schema } from "../core/validation/schema.js";
import { type CycleExecution } from "./cycle-execution.js";
import { type FailedPaymentDetails } from "./failed-payment-details.js";
import { type LastPaymentDetails } from "./last-payment-details.js";
import { type Money } from "./money.js";
export type SubscriptionBillingInformation = {
    outstandingBalance: Money;
    cycleExecutions?: CycleExecution[];
    lastPayment?: LastPaymentDetails;
    nextBillingTime?: string;
    finalPaymentTime?: string;
    failedPaymentsCount: number;
    lastFailedPayment?: FailedPaymentDetails;
};
export declare const subscriptionBillingInformationSchema: Schema<SubscriptionBillingInformation>;
