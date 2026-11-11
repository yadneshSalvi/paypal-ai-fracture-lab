import type { Schema } from "../core/validation/schema.js";
export type Money = {
    currencyCode: string;
    value: string;
};
export declare const moneySchema: Schema<Money>;
