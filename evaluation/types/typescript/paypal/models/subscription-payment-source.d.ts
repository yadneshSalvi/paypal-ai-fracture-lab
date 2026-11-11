import type { Schema } from "../core/validation/schema.js";
import { type SubscriptionCardRequest } from "./subscription-card-request.js";
export type SubscriptionPaymentSource = {
    card?: SubscriptionCardRequest;
};
export declare const subscriptionPaymentSourceSchema: Schema<SubscriptionPaymentSource>;
