import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type Money } from "./money.js";
import { type PlanOverride } from "./plan-override.js";
import { type ShippingDetails } from "./shipping-details.js";
export type ModifySubscriptionResponse = {
    planId?: string;
    quantity?: string;
    shippingAmount?: Money;
    shippingAddress?: ShippingDetails;
    plan?: PlanOverride;
    planOverridden?: boolean;
    links?: LinkDescription[];
};
export declare const modifySubscriptionResponseSchema: Schema<ModifySubscriptionResponse>;
