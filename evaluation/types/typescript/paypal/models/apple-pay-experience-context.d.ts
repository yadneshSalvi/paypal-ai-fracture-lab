import type { Schema } from "../core/validation/schema.js";
export type ApplePayExperienceContext = {
    returnUrl: string;
    cancelUrl: string;
};
export declare const applePayExperienceContextSchema: Schema<ApplePayExperienceContext>;
