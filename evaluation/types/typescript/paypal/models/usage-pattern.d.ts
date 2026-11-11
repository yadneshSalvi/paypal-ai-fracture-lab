import type { EnumSchema } from "../core/validation/schema.js";
export declare const UsagePattern: {
    readonly Immediate: "IMMEDIATE";
    readonly Deferred: "DEFERRED";
    readonly RecurringPrepaid: "RECURRING_PREPAID";
    readonly RecurringPostpaid: "RECURRING_POSTPAID";
    readonly ThresholdPrepaid: "THRESHOLD_PREPAID";
    readonly ThresholdPostpaid: "THRESHOLD_POSTPAID";
    readonly SubscriptionPrepaid: "SUBSCRIPTION_PREPAID";
    readonly SubscriptionPostpaid: "SUBSCRIPTION_POSTPAID";
    readonly UnscheduledPrepaid: "UNSCHEDULED_PREPAID";
    readonly UnscheduledPostpaid: "UNSCHEDULED_POSTPAID";
    readonly InstallmentPrepaid: "INSTALLMENT_PREPAID";
    readonly InstallmentPostpaid: "INSTALLMENT_POSTPAID";
};
export type UsagePattern = (typeof UsagePattern)[keyof typeof UsagePattern] | (string & {});
export declare const usagePatternSchema: EnumSchema<UsagePattern>;
