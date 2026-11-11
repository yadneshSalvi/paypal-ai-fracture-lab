import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
import { type PhoneWithType } from "./phone-with-type.js";
import { type ShippingDetails } from "./shipping-details.js";
import { type SubscriptionPaymentSource } from "./subscription-payment-source.js";
export type SubscriberRequest = {
    emailAddress?: string;
    payerId?: string;
    name?: Name;
    shippingAddress?: ShippingDetails;
    paymentSource?: SubscriptionPaymentSource;
    phone?: PhoneWithType;
};
export declare const subscriberRequestSchema: Schema<SubscriberRequest>;
