import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type TaxAmount = {
    taxAmount?: Money;
};
export declare const taxAmountSchema: Schema<TaxAmount>;
