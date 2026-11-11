import type { Schema } from "../core/validation/schema.js";
export type CancelSubscriptionRequest = {
    reason: string;
};
export declare const cancelSubscriptionRequestSchema: Schema<CancelSubscriptionRequest>;
