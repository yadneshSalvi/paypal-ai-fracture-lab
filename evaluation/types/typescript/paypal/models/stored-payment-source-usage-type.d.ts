import type { EnumSchema } from "../core/validation/schema.js";
export declare const StoredPaymentSourceUsageType: {
    readonly First: "FIRST";
    readonly Subsequent: "SUBSEQUENT";
    readonly Derived: "DERIVED";
};
export type StoredPaymentSourceUsageType = (typeof StoredPaymentSourceUsageType)[keyof typeof StoredPaymentSourceUsageType] | (string & {});
export declare const storedPaymentSourceUsageTypeSchema: EnumSchema<StoredPaymentSourceUsageType>;
