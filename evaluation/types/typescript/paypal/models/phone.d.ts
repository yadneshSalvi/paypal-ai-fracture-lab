import type { Schema } from "../core/validation/schema.js";
export type Phone = {
    countryCode: string;
    nationalNumber: string;
    extensionNumber?: string;
};
export declare const phoneSchema: Schema<Phone>;
