import type { Schema } from "../core/validation/schema.js";
import { ExperienceContextShippingPreference } from "./experience-context-shipping-preference.js";
export type ExperienceContext = {
    brandName?: string;
    locale?: string;
    shippingPreference?: ExperienceContextShippingPreference;
    returnUrl?: string;
    cancelUrl?: string;
};
export declare const experienceContextSchema: Schema<ExperienceContext>;
