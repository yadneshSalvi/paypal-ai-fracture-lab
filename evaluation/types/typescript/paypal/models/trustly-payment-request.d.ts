import type { Schema } from "../core/validation/schema.js";
import { type ExperienceContext } from "./experience-context.js";
export type TrustlyPaymentRequest = {
    name: string;
    countryCode: string;
    email: string;
    experienceContext?: ExperienceContext;
};
export declare const trustlyPaymentRequestSchema: Schema<TrustlyPaymentRequest>;
