import type { Schema } from "../core/validation/schema.js";
import { ApplicationContextUserAction } from "./application-context-user-action.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
import { type PaymentMethod } from "./payment-method.js";
export type SubscriptionApplicationContext = {
    brandName?: string;
    locale?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    userAction?: ApplicationContextUserAction;
    paymentMethod?: PaymentMethod;
    returnUrl: string;
    cancelUrl: string;
};
export declare const subscriptionApplicationContextSchema: Schema<SubscriptionApplicationContext>;
