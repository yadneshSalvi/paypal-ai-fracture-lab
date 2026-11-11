import type { Schema } from "../core/validation/schema.js";
import { type IntervalUnit } from "./interval-unit.js";
export type Frequency = {
    intervalUnit: IntervalUnit;
    intervalCount?: number;
};
export declare const frequencySchema: Schema<Frequency>;
