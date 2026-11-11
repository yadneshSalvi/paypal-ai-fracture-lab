import type { Schema } from "../core/validation/schema.js";
import { type PhoneNumber } from "./phone-number.js";
import { type PhoneType } from "./phone-type.js";
export type PhoneWithType = {
    phoneType?: PhoneType;
    phoneNumber: PhoneNumber;
};
export declare const phoneWithTypeSchema: Schema<PhoneWithType>;
