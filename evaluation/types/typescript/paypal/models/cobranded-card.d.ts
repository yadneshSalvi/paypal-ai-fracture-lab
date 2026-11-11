import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PayeeBase } from "./payee-base.js";
export type CobrandedCard = {
    labels?: string[];
    payee?: PayeeBase;
    amount?: Money;
};
export declare const cobrandedCardSchema: Schema<CobrandedCard>;
