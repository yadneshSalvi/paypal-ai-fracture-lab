import type { Schema } from "../core/validation/schema.js";
import { type CardBrand } from "./card-brand.js";
import { type CardVerificationProcessorResponse } from "./card-verification-processor-response.js";
import { type Money } from "./money.js";
export type CardVerificationDetails = {
    networkTransactionId?: string;
    date?: string;
    network?: CardBrand;
    time?: string;
    amount?: Money;
    processorResponse?: CardVerificationProcessorResponse;
    threeDSecure?: Record<string, unknown>;
};
export declare const cardVerificationDetailsSchema: Schema<CardVerificationDetails>;
