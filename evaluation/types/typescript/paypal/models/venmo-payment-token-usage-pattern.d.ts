import type { EnumSchema } from "../core/validation/schema.js";
export declare const VenmoPaymentTokenUsagePattern: {
    readonly Immediate: "IMMEDIATE";
    readonly Deferred: "DEFERRED";
    readonly RecurringPrepaid: "RECURRING_PREPAID";
    readonly RecurringPostpaid: "RECURRING_POSTPAID";
    readonly ThresholdPrepaid: "THRESHOLD_PREPAID";
    readonly ThresholdPostpaid: "THRESHOLD_POSTPAID";
};
export type VenmoPaymentTokenUsagePattern = (typeof VenmoPaymentTokenUsagePattern)[keyof typeof VenmoPaymentTokenUsagePattern] | (string & {});
export declare const venmoPaymentTokenUsagePatternSchema: EnumSchema<VenmoPaymentTokenUsagePattern>;
