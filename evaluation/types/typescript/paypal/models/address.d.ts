import type { Schema } from "../core/validation/schema.js";
export type Address = {
    addressLine1?: string;
    addressLine2?: string;
    adminArea2?: string;
    adminArea1?: string;
    postalCode?: string;
    countryCode: string;
};
export declare const addressSchema: Schema<Address>;
