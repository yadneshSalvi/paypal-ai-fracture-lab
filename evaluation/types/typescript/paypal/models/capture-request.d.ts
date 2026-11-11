import type { Schema } from "../core/validation/schema.js";
import { type CapturePaymentInstruction } from "./capture-payment-instruction.js";
import { type Money } from "./money.js";
export type CaptureRequest = {
    amount?: Money;
    invoiceId?: string;
    finalCapture?: boolean;
    paymentInstruction?: CapturePaymentInstruction;
    noteToPayer?: string;
    softDescriptor?: string;
};
export declare const captureRequestSchema: Schema<CaptureRequest>;
