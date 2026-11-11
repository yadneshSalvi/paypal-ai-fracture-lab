import type { Schema } from "../core/validation/schema.js";
export type CardResponseAddress = {
    addressLine1?: string;
    addressLine2?: string;
    adminArea2?: string;
    adminArea1?: string;
    postalCode?: string;
    countryCode: string;
    id?: string;
};
export declare const cardResponseAddressSchema: Schema<CardResponseAddress>;
