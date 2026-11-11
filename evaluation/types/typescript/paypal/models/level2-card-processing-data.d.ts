import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type Level2CardProcessingData = {
    invoiceId?: string;
    taxTotal?: Money;
};
export declare const level2CardProcessingDataSchema: Schema<Level2CardProcessingData>;
