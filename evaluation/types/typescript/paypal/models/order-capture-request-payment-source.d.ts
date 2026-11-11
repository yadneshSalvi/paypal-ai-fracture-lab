import type { Schema } from "../core/validation/schema.js";
import { type ApplePayRequest } from "./apple-pay-request.js";
import { type CardRequest } from "./card-request.js";
import { type GooglePayRequest } from "./google-pay-request.js";
import { type PayPalWallet } from "./pay-pal-wallet.js";
import { type Token } from "./token.js";
import { type VenmoWalletRequest } from "./venmo-wallet-request.js";
export type OrderCaptureRequestPaymentSource = {
    card?: CardRequest;
    token?: Token;
    paypal?: PayPalWallet;
    applePay?: ApplePayRequest;
    googlePay?: GooglePayRequest;
    venmo?: VenmoWalletRequest;
};
export declare const orderCaptureRequestPaymentSourceSchema: Schema<OrderCaptureRequestPaymentSource>;
