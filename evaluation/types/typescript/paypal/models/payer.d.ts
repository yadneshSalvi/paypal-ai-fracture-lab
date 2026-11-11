import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type Name } from "./name.js";
import { type PhoneWithType } from "./phone-with-type.js";
import { type TaxInfo } from "./tax-info.js";
export type Payer = {
    emailAddress?: string;
    payerId?: string;
    name?: Name;
    phone?: PhoneWithType;
    birthDate?: string;
    taxInfo?: TaxInfo;
    address?: Address;
};
export declare const payerSchema: Schema<Payer>;
