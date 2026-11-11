import type { Schema } from "../core/validation/schema.js";
export type PhoneNumberWithCountryCode = {
    countryCode: string;
    nationalNumber: string;
};
export declare const phoneNumberWithCountryCodeSchema: Schema<PhoneNumberWithCountryCode>;
