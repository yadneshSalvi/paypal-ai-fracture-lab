import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type Subscription } from "./subscription.js";
export type SubscriptionCollection = {
    subscriptions?: Subscription[];
    links?: LinkDescription[];
};
export declare const subscriptionCollectionSchema: Schema<SubscriptionCollection>;
