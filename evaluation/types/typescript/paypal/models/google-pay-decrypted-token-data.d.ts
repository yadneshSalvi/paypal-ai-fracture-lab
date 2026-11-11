import type { Schema } from "../core/validation/schema.js";
import { type GooglePayAuthenticationMethod } from "./google-pay-authentication-method.js";
import { type GooglePayCard } from "./google-pay-card.js";
import { type GooglePayPaymentMethod } from "./google-pay-payment-method.js";
export type GooglePayDecryptedTokenData = {
    messageId?: string;
    messageExpiration?: string;
    paymentMethod: GooglePayPaymentMethod;
    card: GooglePayCard;
    authenticationMethod: GooglePayAuthenticationMethod;
    cryptogram?: string;
    eciIndicator?: string;
};
export declare const googlePayDecryptedTokenDataSchema: Schema<GooglePayDecryptedTokenData>;
