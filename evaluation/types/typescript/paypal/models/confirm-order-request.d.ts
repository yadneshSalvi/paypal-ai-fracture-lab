import type { Schema } from "../core/validation/schema.js";
import { type OrderConfirmApplicationContext } from "./order-confirm-application-context.js";
import { type PaymentSource } from "./payment-source.js";
import { type ProcessingInstruction } from "./processing-instruction.js";
export type ConfirmOrderRequest = {
    paymentSource: PaymentSource;
    processingInstruction?: ProcessingInstruction;
    applicationContext?: OrderConfirmApplicationContext;
};
export declare const confirmOrderRequestSchema: Schema<ConfirmOrderRequest>;
