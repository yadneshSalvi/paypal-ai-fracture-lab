import type { Schema } from "../core/validation/schema.js";
export type SubscriptionPayerName = {
    prefix?: string;
    givenName?: string;
    surname?: string;
    middleName?: string;
    suffix?: string;
    fullName?: string;
};
export declare const subscriptionPayerNameSchema: Schema<SubscriptionPayerName>;
