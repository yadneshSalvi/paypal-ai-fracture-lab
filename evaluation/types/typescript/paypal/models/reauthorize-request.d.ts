import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type ReauthorizeRequest = {
    amount?: Money;
};
export declare const reauthorizeRequestSchema: Schema<ReauthorizeRequest>;
