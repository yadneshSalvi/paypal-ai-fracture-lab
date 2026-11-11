import type { Schema } from "../core/validation/schema.js";
import { type ExperienceContext } from "./experience-context.js";
export type P24PaymentRequest = {
    name: string;
    email: string;
    countryCode: string;
    experienceContext?: ExperienceContext;
};
export declare const p24PaymentRequestSchema: Schema<P24PaymentRequest>;
