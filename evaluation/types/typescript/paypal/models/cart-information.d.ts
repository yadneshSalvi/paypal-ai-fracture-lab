import type { Schema } from "../core/validation/schema.js";
import { type ItemDetails } from "./item-details.js";
export type CartInformation = {
    itemDetails?: ItemDetails[];
    taxInclusive?: boolean;
    paypalInvoiceId?: string;
};
export declare const cartInformationSchema: Schema<CartInformation>;
