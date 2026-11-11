import type { Schema } from "../core/validation/schema.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
import { type PaymentMethod } from "./payment-method.js";
export type SubscriptionPatchApplicationContext = {
    brandName?: string;
    locale?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    paymentMethod?: PaymentMethod;
    returnUrl: string;
    cancelUrl: string;
};
export declare const subscriptionPatchApplicationContextSchema: Schema<SubscriptionPatchApplicationContext>;
