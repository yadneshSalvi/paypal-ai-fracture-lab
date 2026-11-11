import type { Schema } from "../core/validation/schema.js";
import { type GooglePayCardResponse } from "./google-pay-card-response.js";
import { type PhoneNumberWithCountryCode } from "./phone-number-with-country-code.js";
export type GooglePayWalletResponse = {
    name?: string;
    emailAddress?: string;
    phoneNumber?: PhoneNumberWithCountryCode;
    card?: GooglePayCardResponse;
};
export declare const googlePayWalletResponseSchema: Schema<GooglePayWalletResponse>;
