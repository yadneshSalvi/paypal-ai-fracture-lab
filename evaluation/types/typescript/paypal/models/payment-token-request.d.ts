import type { Schema } from "../core/validation/schema.js";
import { type Customer } from "./customer.js";
import { type PaymentTokenRequestPaymentSource } from "./payment-token-request-payment-source.js";
export type PaymentTokenRequest = {
    customer?: Customer;
    paymentSource: PaymentTokenRequestPaymentSource;
};
export declare const paymentTokenRequestSchema: Schema<PaymentTokenRequest>;
