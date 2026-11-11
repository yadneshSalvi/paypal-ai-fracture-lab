import type { Schema } from "../core/validation/schema.js";
import { type Customer } from "./customer.js";
import { type LinkDescription } from "./link-description.js";
import { PaymentTokenStatus } from "./payment-token-status.js";
import { type SetupTokenResponsePaymentSource } from "./setup-token-response-payment-source.js";
export type SetupTokenResponse = {
    id?: string;
    customer?: Customer;
    status?: PaymentTokenStatus;
    paymentSource?: SetupTokenResponsePaymentSource;
    links?: LinkDescription[];
};
export declare const setupTokenResponseSchema: Schema<SetupTokenResponse>;
