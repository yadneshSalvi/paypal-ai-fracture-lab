import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
import { type PhoneWithType } from "./phone-with-type.js";
export type CardCustomerInformation = {
    id?: string;
    emailAddress?: string;
    phone?: PhoneWithType;
    name?: Name;
    merchantCustomerId?: string;
};
export declare const cardCustomerInformationSchema: Schema<CardCustomerInformation>;
