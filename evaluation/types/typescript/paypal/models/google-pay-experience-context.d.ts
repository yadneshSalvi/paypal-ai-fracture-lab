import type { Schema } from "../core/validation/schema.js";
export type GooglePayExperienceContext = {
    returnUrl: string;
    cancelUrl: string;
};
export declare const googlePayExperienceContextSchema: Schema<GooglePayExperienceContext>;
