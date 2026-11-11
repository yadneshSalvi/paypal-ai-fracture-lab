import type { Schema } from "../core/validation/schema.js";
import { type PayPalPaymentToken } from "./pay-pal-payment-token.js";
import { type SetupTokenResponseCard } from "./setup-token-response-card.js";
import { type VenmoPaymentToken } from "./venmo-payment-token.js";
export type SetupTokenResponsePaymentSource = {
    card?: SetupTokenResponseCard;
    paypal?: PayPalPaymentToken;
    venmo?: VenmoPaymentToken;
};
export declare const setupTokenResponsePaymentSourceSchema: Schema<SetupTokenResponsePaymentSource>;
