import type { Schema } from "../core/validation/schema.js";
export type PhoneNumberWithOptionalCountryCode = {
    countryCode?: string;
    nationalNumber: string;
};
export declare const phoneNumberWithOptionalCountryCodeSchema: Schema<PhoneNumberWithOptionalCountryCode>;
