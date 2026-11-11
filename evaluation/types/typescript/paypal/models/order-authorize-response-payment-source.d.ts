import type { Schema } from "../core/validation/schema.js";
import { type ApplePayPaymentObject } from "./apple-pay-payment-object.js";
import { type CardResponse } from "./card-response.js";
import { type GooglePayWalletResponse } from "./google-pay-wallet-response.js";
import { type PayPalWalletResponse } from "./pay-pal-wallet-response.js";
import { type VenmoWalletResponse } from "./venmo-wallet-response.js";
export type OrderAuthorizeResponsePaymentSource = {
    card?: CardResponse;
    paypal?: PayPalWalletResponse;
    applePay?: ApplePayPaymentObject;
    googlePay?: GooglePayWalletResponse;
    venmo?: VenmoWalletResponse;
};
export declare const orderAuthorizeResponsePaymentSourceSchema: Schema<OrderAuthorizeResponsePaymentSource>;
