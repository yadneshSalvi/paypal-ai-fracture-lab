import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type CardType } from "./card-type.js";
import { type SubscriptionsCardAttributes } from "./subscriptions-card-attributes.js";
import { type SubscriptionsCardBrand } from "./subscriptions-card-brand.js";
export type SubscriptionCardRequest = {
    name?: string;
    number?: string;
    expiry?: string;
    securityCode?: string;
    type?: CardType;
    brand?: SubscriptionsCardBrand;
    billingAddress?: Address;
    attributes?: SubscriptionsCardAttributes;
};
export declare const subscriptionCardRequestSchema: Schema<SubscriptionCardRequest>;
