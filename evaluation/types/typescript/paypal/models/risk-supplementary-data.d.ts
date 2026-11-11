import type { Schema } from "../core/validation/schema.js";
import { type ParticipantMetadata } from "./participant-metadata.js";
export type RiskSupplementaryData = {
    customer?: ParticipantMetadata;
};
export declare const riskSupplementaryDataSchema: Schema<RiskSupplementaryData>;
