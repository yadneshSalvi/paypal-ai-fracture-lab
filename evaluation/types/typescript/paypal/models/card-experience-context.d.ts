import type { Schema } from "../core/validation/schema.js";
export type CardExperienceContext = {
    returnUrl?: string;
    cancelUrl?: string;
};
export declare const cardExperienceContextSchema: Schema<CardExperienceContext>;
