import type { Schema } from "../core/validation/schema.js";
export type CheckoutOption = {
    checkoutOptionName?: string;
    checkoutOptionValue?: string;
};
export declare const checkoutOptionSchema: Schema<CheckoutOption>;
