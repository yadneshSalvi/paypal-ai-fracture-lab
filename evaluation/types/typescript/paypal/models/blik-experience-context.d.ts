import type { Schema } from "../core/validation/schema.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
export type BlikExperienceContext = {
    brandName?: string;
    locale?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    returnUrl?: string;
    cancelUrl?: string;
    consumerIp?: string;
    consumerUserAgent?: string;
};
export declare const blikExperienceContextSchema: Schema<BlikExperienceContext>;
