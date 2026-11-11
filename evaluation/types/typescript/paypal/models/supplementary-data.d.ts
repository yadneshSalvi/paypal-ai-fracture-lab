import type { Schema } from "../core/validation/schema.js";
import { type CardSupplementaryData } from "./card-supplementary-data.js";
import { type RiskSupplementaryData } from "./risk-supplementary-data.js";
export type SupplementaryData = {
    card?: CardSupplementaryData;
    risk?: RiskSupplementaryData;
};
export declare const supplementaryDataSchema: Schema<SupplementaryData>;
