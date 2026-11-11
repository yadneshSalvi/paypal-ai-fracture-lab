import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type RefundPaymentInstruction } from "./refund-payment-instruction.js";
export type RefundRequest = {
    amount?: Money;
    customId?: string;
    invoiceId?: string;
    noteToPayer?: string;
    paymentInstruction?: RefundPaymentInstruction;
};
export declare const refundRequestSchema: Schema<RefundRequest>;
