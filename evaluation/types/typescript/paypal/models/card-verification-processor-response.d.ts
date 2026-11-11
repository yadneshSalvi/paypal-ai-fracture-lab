import type { Schema } from "../core/validation/schema.js";
import { type AvsCode } from "./avs-code.js";
import { type CvvCode } from "./cvv-code.js";
export type CardVerificationProcessorResponse = {
    avsCode?: AvsCode;
    cvvCode?: CvvCode;
};
export declare const cardVerificationProcessorResponseSchema: Schema<CardVerificationProcessorResponse>;
