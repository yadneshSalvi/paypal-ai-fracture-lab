import type { Schema } from "../core/validation/schema.js";
import { type Name } from "./name.js";
import { type PhoneWithType } from "./phone-with-type.js";
export type VenmoWalletCustomerInformation = {
    id?: string;
    emailAddress?: string;
    phone?: PhoneWithType;
    name?: Name;
};
export declare const venmoWalletCustomerInformationSchema: Schema<VenmoWalletCustomerInformation>;
