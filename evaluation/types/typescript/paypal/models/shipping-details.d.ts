import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type FulfillmentType } from "./fulfillment-type.js";
import { type PhoneNumberWithCountryCode } from "./phone-number-with-country-code.js";
import { type ShippingName } from "./shipping-name.js";
import { type ShippingOption } from "./shipping-option.js";
export type ShippingDetails = {
    name?: ShippingName;
    emailAddress?: string;
    phoneNumber?: PhoneNumberWithCountryCode;
    type?: FulfillmentType;
    options?: ShippingOption[];
    address?: Address;
};
export declare const shippingDetailsSchema: Schema<ShippingDetails>;
