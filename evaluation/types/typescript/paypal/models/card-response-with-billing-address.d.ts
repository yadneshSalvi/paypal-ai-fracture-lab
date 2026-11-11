import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
export type CardResponseWithBillingAddress = {
    name?: string;
    billingAddress?: Address;
    expiry?: string;
    currencyCode?: string;
};
export declare const cardResponseWithBillingAddressSchema: Schema<CardResponseWithBillingAddress>;
