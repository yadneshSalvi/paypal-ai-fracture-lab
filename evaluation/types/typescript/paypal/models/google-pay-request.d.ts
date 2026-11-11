import type { Schema } from "../core/validation/schema.js";
import { type AssuranceDetails } from "./assurance-details.js";
import { type GooglePayDecryptedTokenData } from "./google-pay-decrypted-token-data.js";
import { type GooglePayExperienceContext } from "./google-pay-experience-context.js";
import { type GooglePayRequestCard } from "./google-pay-request-card.js";
import { type PhoneNumberWithCountryCode } from "./phone-number-with-country-code.js";
export type GooglePayRequest = {
    name?: string;
    emailAddress?: string;
    phoneNumber?: PhoneNumberWithCountryCode;
    card?: GooglePayRequestCard;
    decryptedToken?: GooglePayDecryptedTokenData;
    assuranceDetails?: AssuranceDetails;
    experienceContext?: GooglePayExperienceContext;
};
export declare const googlePayRequestSchema: Schema<GooglePayRequest>;
