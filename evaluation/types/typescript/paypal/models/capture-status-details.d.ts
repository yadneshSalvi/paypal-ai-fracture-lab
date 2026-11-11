import type { Schema } from "../core/validation/schema.js";
import { type CaptureIncompleteReason } from "./capture-incomplete-reason.js";
export type CaptureStatusDetails = {
    reason?: CaptureIncompleteReason;
};
export declare const captureStatusDetailsSchema: Schema<CaptureStatusDetails>;
