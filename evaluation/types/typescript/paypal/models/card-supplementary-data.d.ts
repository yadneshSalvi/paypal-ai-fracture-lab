import type { Schema } from "../core/validation/schema.js";
import { type Level2CardProcessingData } from "./level2-card-processing-data.js";
import { type Level3CardProcessingData } from "./level3-card-processing-data.js";
export type CardSupplementaryData = {
    level2?: Level2CardProcessingData;
    level3?: Level3CardProcessingData;
};
export declare const cardSupplementaryDataSchema: Schema<CardSupplementaryData>;
