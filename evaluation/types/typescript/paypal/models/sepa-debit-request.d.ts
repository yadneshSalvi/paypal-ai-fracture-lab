import type { Schema } from "../core/validation/schema.js";
import { type SepaDebitExperienceContext } from "./sepa-debit-experience-context.js";
export type SepaDebitRequest = {
    experienceContext?: SepaDebitExperienceContext;
};
export declare const sepaDebitRequestSchema: Schema<SepaDebitRequest>;
