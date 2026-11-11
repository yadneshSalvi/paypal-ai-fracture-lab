import type { Schema } from "../core/validation/schema.js";
import { type OrderCaptureRequestPaymentSource } from "./order-capture-request-payment-source.js";
export type OrderCaptureRequest = {
    paymentSource?: OrderCaptureRequestPaymentSource;
};
export declare const orderCaptureRequestSchema: Schema<OrderCaptureRequest>;
