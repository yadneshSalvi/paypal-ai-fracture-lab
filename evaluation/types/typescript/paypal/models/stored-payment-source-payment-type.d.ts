import type { EnumSchema } from "../core/validation/schema.js";
export declare const StoredPaymentSourcePaymentType: {
    readonly OneTime: "ONE_TIME";
    readonly Recurring: "RECURRING";
    readonly Unscheduled: "UNSCHEDULED";
};
export type StoredPaymentSourcePaymentType = (typeof StoredPaymentSourcePaymentType)[keyof typeof StoredPaymentSourcePaymentType] | (string & {});
export declare const storedPaymentSourcePaymentTypeSchema: EnumSchema<StoredPaymentSourcePaymentType>;
