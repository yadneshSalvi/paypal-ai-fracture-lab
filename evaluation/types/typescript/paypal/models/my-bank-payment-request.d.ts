import type { Schema } from "../core/validation/schema.js";
import { type ExperienceContext } from "./experience-context.js";
export type MyBankPaymentRequest = {
    name: string;
    countryCode: string;
    experienceContext?: ExperienceContext;
};
export declare const myBankPaymentRequestSchema: Schema<MyBankPaymentRequest>;
