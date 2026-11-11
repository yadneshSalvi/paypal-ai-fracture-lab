import type { Schema } from "../core/validation/schema.js";
import { type CaptureStatusDetails } from "./capture-status-details.js";
import { type CaptureStatus } from "./capture-status.js";
export type CaptureStatusWithDetails = {
    status?: CaptureStatus;
    statusDetails?: CaptureStatusDetails;
};
export declare const captureStatusWithDetailsSchema: Schema<CaptureStatusWithDetails>;
