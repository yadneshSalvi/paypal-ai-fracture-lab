import type { Schema } from "../core/validation/schema.js";
import { type PaymentTokenRequestCard } from "./payment-token-request-card.js";
import { type VaultTokenRequest } from "./vault-token-request.js";
export type PaymentTokenRequestPaymentSource = {
    card?: PaymentTokenRequestCard;
    token?: VaultTokenRequest;
};
export declare const paymentTokenRequestPaymentSourceSchema: Schema<PaymentTokenRequestPaymentSource>;
