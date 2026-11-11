import type { Schema } from "../core/validation/schema.js";
import { type ExchangeRate } from "./exchange-rate.js";
import { type Money } from "./money.js";
export type NetAmountBreakdownItem = {
    payableAmount?: Money;
    convertedAmount?: Money;
    exchangeRate?: ExchangeRate;
};
export declare const netAmountBreakdownItemSchema: Schema<NetAmountBreakdownItem>;
