import type { Schema } from "../core/validation/schema.js";
import { type IncentiveDetails } from "./incentive-details.js";
export type IncentiveInformation = {
    incentiveDetails?: IncentiveDetails[];
};
export declare const incentiveInformationSchema: Schema<IncentiveInformation>;
