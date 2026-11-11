import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type PayeeBase } from "./payee-base.js";
export type PlatformFee = {
    amount: Money;
    payee?: PayeeBase;
};
export declare const platformFeeSchema: Schema<PlatformFee>;
