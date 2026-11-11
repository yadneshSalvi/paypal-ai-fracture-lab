import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type LastPaymentDetails = {
    amount?: Money;
    time?: string;
};
export declare const lastPaymentDetailsSchema: Schema<LastPaymentDetails>;
