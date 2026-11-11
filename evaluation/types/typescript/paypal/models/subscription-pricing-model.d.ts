import type { EnumSchema } from "../core/validation/schema.js";
export declare const SubscriptionPricingModel: {
    readonly Volume: "VOLUME";
    readonly Tiered: "TIERED";
};
export type SubscriptionPricingModel = (typeof SubscriptionPricingModel)[keyof typeof SubscriptionPricingModel] | (string & {});
export declare const subscriptionPricingModelSchema: EnumSchema<SubscriptionPricingModel>;
