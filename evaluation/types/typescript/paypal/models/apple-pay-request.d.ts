import type { Schema } from "../core/validation/schema.js";
import { type ApplePayAttributes } from "./apple-pay-attributes.js";
import { type ApplePayDecryptedTokenData } from "./apple-pay-decrypted-token-data.js";
import { type ApplePayExperienceContext } from "./apple-pay-experience-context.js";
import { type CardStoredCredential } from "./card-stored-credential.js";
import { type PhoneNumber } from "./phone-number.js";
export type ApplePayRequest = {
    id?: string;
    name?: string;
    emailAddress?: string;
    phoneNumber?: PhoneNumber;
    decryptedToken?: ApplePayDecryptedTokenData;
    storedCredential?: CardStoredCredential;
    vaultId?: string;
    attributes?: ApplePayAttributes;
    experienceContext?: ApplePayExperienceContext;
};
export declare const applePayRequestSchema: Schema<ApplePayRequest>;
