import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
import { type ShippingDetails } from "./shipping-details.js";
import { type SubscriptionPaymentSourceResponse } from "./subscription-payment-source-response.js";
export type Subscriber = {
    emailAddress?: string;
    payerId?: string;
    name?: Name;
    shippingAddress?: ShippingDetails;
    paymentSource?: SubscriptionPaymentSourceResponse;
};
export declare const subscriberSchema: Schema<Subscriber>;
