import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type FulfillmentType } from "./fulfillment-type.js";
import { type OrderTrackerResponse } from "./order-tracker-response.js";
import { type PhoneNumberWithOptionalCountryCode } from "./phone-number-with-optional-country-code.js";
import { type ShippingName } from "./shipping-name.js";
import { type ShippingOption } from "./shipping-option.js";
export type ShippingWithTrackingDetails = {
    trackers?: OrderTrackerResponse[];
    name?: ShippingName;
    emailAddress?: string;
    phoneNumber?: PhoneNumberWithOptionalCountryCode;
    type?: FulfillmentType;
    options?: ShippingOption[];
    address?: Address;
};
export declare const shippingWithTrackingDetailsSchema: Schema<ShippingWithTrackingDetails>;
