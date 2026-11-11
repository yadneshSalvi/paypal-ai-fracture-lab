import type { Schema } from "../core/validation/schema.js";
import { type Customer } from "./customer.js";
import { type SetupTokenRequestPaymentSource } from "./setup-token-request-payment-source.js";
export type SetupTokenRequest = {
    customer?: Customer;
    paymentSource: SetupTokenRequestPaymentSource;
};
export declare const setupTokenRequestSchema: Schema<SetupTokenRequest>;
