import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type PaymentTokenResponse } from "./payment-token-response.js";
import { type VaultResponseCustomer } from "./vault-response-customer.js";
export type CustomerVaultPaymentTokensResponse = {
    totalItems?: number;
    totalPages?: number;
    customer?: VaultResponseCustomer;
    paymentTokens?: PaymentTokenResponse[];
    links?: LinkDescription[];
};
export declare const customerVaultPaymentTokensResponseSchema: Schema<CustomerVaultPaymentTokensResponse>;
