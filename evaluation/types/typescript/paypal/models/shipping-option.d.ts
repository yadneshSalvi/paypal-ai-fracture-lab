import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type ShippingType } from "./shipping-type.js";
export type ShippingOption = {
    id: string;
    label: string;
    type?: ShippingType;
    amount?: Money;
    selected: boolean;
};
export declare const shippingOptionSchema: Schema<ShippingOption>;
