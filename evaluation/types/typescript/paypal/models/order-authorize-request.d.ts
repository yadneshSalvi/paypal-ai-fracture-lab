import type { Schema } from "../core/validation/schema.js";
import { type OrderAuthorizeRequestPaymentSource } from "./order-authorize-request-payment-source.js";
export type OrderAuthorizeRequest = {
    paymentSource?: OrderAuthorizeRequestPaymentSource;
};
export declare const orderAuthorizeRequestSchema: Schema<OrderAuthorizeRequest>;
