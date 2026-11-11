import type { Schema } from "../core/validation/schema.js";
import { type AmountBreakdown } from "./amount-breakdown.js";
export type AmountWithBreakdown = {
    currencyCode: string;
    value: string;
    breakdown?: AmountBreakdown;
};
export declare const amountWithBreakdownSchema: Schema<AmountWithBreakdown>;
