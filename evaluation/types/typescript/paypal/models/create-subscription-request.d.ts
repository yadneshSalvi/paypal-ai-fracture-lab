import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PlanOverride } from "./plan-override.js";
import { type SubscriberRequest } from "./subscriber-request.js";
import { type SubscriptionApplicationContext } from "./subscription-application-context.js";
export type CreateSubscriptionRequest = {
    planId: string;
    startTime?: string;
    quantity?: string;
    shippingAmount?: Money;
    subscriber?: SubscriberRequest;
    autoRenewal?: boolean;
    applicationContext?: SubscriptionApplicationContext;
    customId?: string;
    plan?: PlanOverride;
};
export declare const createSubscriptionRequestSchema: Schema<CreateSubscriptionRequest>;
