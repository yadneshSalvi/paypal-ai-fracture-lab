import type { Schema } from "../core/validation/schema.js";
export type PhoneNumber = {
    nationalNumber: string;
};
export declare const phoneNumberSchema: Schema<PhoneNumber>;
