import type { Schema } from "../core/validation/schema.js";
export type SuspendSubscription = {
    reason: string;
};
export declare const suspendSubscriptionSchema: Schema<SuspendSubscription>;
