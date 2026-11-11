import type { Schema } from "../core/validation/schema.js";
import { type PhoneWithType } from "./phone-with-type.js";
export type SubscriptionCustomerInformation = {
    id?: string;
    emailAddress?: string;
    phone?: PhoneWithType;
};
export declare const subscriptionCustomerInformationSchema: Schema<SubscriptionCustomerInformation>;
