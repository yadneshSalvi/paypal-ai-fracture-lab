import type { Schema } from "../core/validation/schema.js";
import { type CustomerResponse } from "./customer-response.js";
import { type LinkDescription } from "./link-description.js";
import { type PaymentTokenResponsePaymentSource } from "./payment-token-response-payment-source.js";
export type PaymentTokenResponse = {
    id?: string;
    customer?: CustomerResponse;
    paymentSource?: PaymentTokenResponsePaymentSource;
    links?: LinkDescription[];
};
export declare const paymentTokenResponseSchema: Schema<PaymentTokenResponse>;
