import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type IncentiveDetails = {
    incentiveType?: string;
    incentiveCode?: string;
    incentiveAmount?: Money;
    incentiveProgramCode?: string;
};
export declare const incentiveDetailsSchema: Schema<IncentiveDetails>;
