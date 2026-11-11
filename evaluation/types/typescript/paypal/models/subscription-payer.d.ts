import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
export type SubscriptionPayer = {
    emailAddress?: string;
    payerId?: string;
    name?: Name;
};
export declare const subscriptionPayerSchema: Schema<SubscriptionPayer>;
