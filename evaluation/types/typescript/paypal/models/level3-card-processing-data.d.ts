import type { Schema } from "../core/validation/schema.js";
import { type Address } from "./address.js";
import { type LineItem } from "./line-item.js";
import { type Money } from "./money.js";
export type Level3CardProcessingData = {
    shippingAmount?: Money;
    dutyAmount?: Money;
    discountAmount?: Money;
    shippingAddress?: Address;
    shipsFromPostalCode?: string;
    lineItems?: LineItem[];
};
export declare const level3CardProcessingDataSchema: Schema<Level3CardProcessingData>;
