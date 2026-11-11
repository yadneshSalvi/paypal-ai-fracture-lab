import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type Name } from "./name.js";
import { type PhoneNumber } from "./phone-number.js";
import { ReturnFlow } from "./return-flow.js";
import { type VenmoWalletAttributesResponse } from "./venmo-wallet-attributes-response.js";
export type VenmoWalletResponse = {
    emailAddress?: string;
    accountId?: string;
    userName?: string;
    name?: Name;
    phoneNumber?: PhoneNumber;
    address?: Address;
    returnFlow?: ReturnFlow;
    attributes?: VenmoWalletAttributesResponse;
};
export declare const venmoWalletResponseSchema: Schema<VenmoWalletResponse>;
