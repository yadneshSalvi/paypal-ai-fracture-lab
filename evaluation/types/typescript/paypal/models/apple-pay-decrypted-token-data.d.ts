import type { Schema } from "../core/validation/schema.js";
import { type ApplePayPaymentDataType } from "./apple-pay-payment-data-type.js";
import { type ApplePayPaymentData } from "./apple-pay-payment-data.js";
import { type ApplePayTokenizedCard } from "./apple-pay-tokenized-card.js";
import { type Money } from "./money.js";
export type ApplePayDecryptedTokenData = {
    transactionAmount?: Money;
    tokenizedCard: ApplePayTokenizedCard;
    deviceManufacturerId?: string;
    paymentDataType?: ApplePayPaymentDataType;
    paymentData?: ApplePayPaymentData;
};
export declare const applePayDecryptedTokenDataSchema: Schema<ApplePayDecryptedTokenData>;
