import type { Schema } from "../core/validation/schema.js";
import { type ApplePayAttributesResponse } from "./apple-pay-attributes-response.js";
import { type ApplePayCardResponse } from "./apple-pay-card-response.js";
import { type CardStoredCredential } from "./card-stored-credential.js";
import { type PhoneNumber } from "./phone-number.js";
export type ApplePayPaymentObject = {
    id?: string;
    token?: string;
    name?: string;
    emailAddress?: string;
    phoneNumber?: PhoneNumber;
    card?: ApplePayCardResponse;
    attributes?: ApplePayAttributesResponse;
    storedCredential?: CardStoredCredential;
};
export declare const applePayPaymentObjectSchema: Schema<ApplePayPaymentObject>;
