import type { Schema } from "../core/validation/schema.js";
export type ExchangeRate = {
    sourceCurrency?: string;
    targetCurrency?: string;
    value?: string;
};
export declare const exchangeRateSchema: Schema<ExchangeRate>;
