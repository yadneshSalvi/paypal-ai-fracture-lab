import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PlanOverride } from "./plan-override.js";
import { type ShippingDetails } from "./shipping-details.js";
import { type SubscriptionPatchApplicationContext } from "./subscription-patch-application-context.js";
export type ModifySubscriptionRequest = {
    planId?: string;
    quantity?: string;
    shippingAmount?: Money;
    shippingAddress?: ShippingDetails;
    applicationContext?: SubscriptionPatchApplicationContext;
    plan?: PlanOverride;
};
export declare const modifySubscriptionRequestSchema: Schema<ModifySubscriptionRequest>;
