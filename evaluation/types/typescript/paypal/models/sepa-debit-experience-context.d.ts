import type { Schema } from "../core/validation/schema.js";
export type SepaDebitExperienceContext = {
    locale?: string;
    returnUrl: string;
    cancelUrl: string;
};
export declare const sepaDebitExperienceContextSchema: Schema<SepaDebitExperienceContext>;
