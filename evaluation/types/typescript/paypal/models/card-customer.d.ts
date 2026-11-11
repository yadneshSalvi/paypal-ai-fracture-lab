import type { Schema } from "../core/validation/schema.js";
import { type PhoneWithType } from "./phone-with-type.js";
export type CardCustomer = {
    id?: string;
    emailAddress?: string;
    phone?: PhoneWithType;
    merchantCustomerId?: string;
};
export declare const cardCustomerSchema: Schema<CardCustomer>;
