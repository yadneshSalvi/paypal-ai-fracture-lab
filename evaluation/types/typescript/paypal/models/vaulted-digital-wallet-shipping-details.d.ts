import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type FulfillmentType } from "./fulfillment-type.js";
import { type PhoneNumberWithCountryCode } from "./phone-number-with-country-code.js";
import { type ShippingName } from "./shipping-name.js";
export type VaultedDigitalWalletShippingDetails = {
    name?: ShippingName;
    emailAddress?: string;
    phoneNumber?: PhoneNumberWithCountryCode;
    type?: FulfillmentType;
    address?: Address;
};
export declare const vaultedDigitalWalletShippingDetailsSchema: Schema<VaultedDigitalWalletShippingDetails>;
