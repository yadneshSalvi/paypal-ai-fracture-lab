import type { Schema } from "../core/validation/schema.js";
import { type ExperienceContext } from "./experience-context.js";
export type IDealPaymentRequest = {
    name: string;
    countryCode: string;
    bic?: string;
    experienceContext?: ExperienceContext;
};
export declare const iDealPaymentRequestSchema: Schema<IDealPaymentRequest>;
