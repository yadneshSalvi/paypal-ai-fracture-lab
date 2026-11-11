import type { Schema } from "../core/validation/schema.js";
import { type ApplePayCard } from "./apple-pay-card.js";
export type ApplePayPaymentToken = {
    card?: ApplePayCard;
};
export declare const applePayPaymentTokenSchema: Schema<ApplePayPaymentToken>;
