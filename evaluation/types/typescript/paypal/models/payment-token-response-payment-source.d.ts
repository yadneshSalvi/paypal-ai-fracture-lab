import type { Schema } from "../core/validation/schema.js";
import { type ApplePayPaymentToken } from "./apple-pay-payment-token.js";
import { type CardPaymentTokenEntity } from "./card-payment-token-entity.js";
import { type PayPalPaymentToken } from "./pay-pal-payment-token.js";
import { type VenmoPaymentToken } from "./venmo-payment-token.js";
export type PaymentTokenResponsePaymentSource = {
    card?: CardPaymentTokenEntity;
    paypal?: PayPalPaymentToken;
    venmo?: VenmoPaymentToken;
    applePay?: ApplePayPaymentToken;
};
export declare const paymentTokenResponsePaymentSourceSchema: Schema<PaymentTokenResponsePaymentSource>;
