import type { EnumSchema } from "../core/validation/schema.js";
export declare const UsageType: {
    readonly Merchant: "MERCHANT";
    readonly Platform: "PLATFORM";
};
export type UsageType = (typeof UsageType)[keyof typeof UsageType] | (string & {});
export declare const usageTypeSchema: EnumSchema<UsageType>;
