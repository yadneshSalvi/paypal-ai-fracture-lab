import type { EnumSchema } from "../core/validation/schema.js";
export declare const SubscriptionPlanStatus: {
    readonly Created: "CREATED";
    readonly Inactive: "INACTIVE";
    readonly Active: "ACTIVE";
};
export type SubscriptionPlanStatus = (typeof SubscriptionPlanStatus)[keyof typeof SubscriptionPlanStatus] | (string & {});
export declare const subscriptionPlanStatusSchema: EnumSchema<SubscriptionPlanStatus>;
