import type { Schema } from "../core/validation/schema.js";
import { type AvsCode } from "./avs-code.js";
import { type CvvCode } from "./cvv-code.js";
import { type PaymentAdviceCode } from "./payment-advice-code.js";
import { type ProcessorResponseCode } from "./processor-response-code.js";
export type ProcessorResponse = {
    avsCode?: AvsCode;
    cvvCode?: CvvCode;
    responseCode?: ProcessorResponseCode;
    paymentAdviceCode?: PaymentAdviceCode;
};
export declare const processorResponseSchema: Schema<ProcessorResponse>;
