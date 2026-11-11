import type { Schema } from "../core/validation/schema.js";
import { type CheckoutPaymentIntent } from "./checkout-payment-intent.js";
import { type OrderApplicationContext } from "./order-application-context.js";
import { type Payer } from "./payer.js";
import { type PaymentSource } from "./payment-source.js";
import { type ProcessingInstruction } from "./processing-instruction.js";
import { type PurchaseUnitRequest } from "./purchase-unit-request.js";
export type OrderRequest = {
    intent: CheckoutPaymentIntent;
    processingInstruction?: ProcessingInstruction;
    payer?: Payer;
    purchaseUnits: PurchaseUnitRequest[];
    paymentSource?: PaymentSource;
    applicationContext?: OrderApplicationContext;
};
export declare const orderRequestSchema: Schema<OrderRequest>;
