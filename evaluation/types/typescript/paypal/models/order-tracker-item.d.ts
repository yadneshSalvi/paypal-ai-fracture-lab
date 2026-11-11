import type { Schema } from "../core/validation/schema.js";
import { type UniversalProductCode } from "./universal-product-code.js";
export type OrderTrackerItem = {
    name?: string;
    quantity?: string;
    sku?: string;
    url?: string;
    imageUrl?: string;
    upc?: UniversalProductCode;
};
export declare const orderTrackerItemSchema: Schema<OrderTrackerItem>;
