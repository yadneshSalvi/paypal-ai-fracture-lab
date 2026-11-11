import type { Schema } from "../core/validation/schema.js";
import { type PayerName } from "./payer-name.js";
import { type Phone } from "./phone.js";
import { type SimplePostalAddressCoarseGrained } from "./simple-postal-address-coarse-grained.js";
export type PayerInformation = {
    accountId?: string;
    emailAddress?: string;
    phoneNumber?: Phone;
    addressStatus?: string;
    payerStatus?: string;
    payerName?: PayerName;
    countryCode?: string;
    address?: SimplePostalAddressCoarseGrained;
};
export declare const payerInformationSchema: Schema<PayerInformation>;
