import type { EnumSchema } from "../core/validation/schema.js";
export declare const CaptureStatus: {
    readonly Completed: "COMPLETED";
    readonly Declined: "DECLINED";
    readonly PartiallyRefunded: "PARTIALLY_REFUNDED";
    readonly Pending: "PENDING";
    readonly Refunded: "REFUNDED";
    readonly Failed: "FAILED";
};
export type CaptureStatus = (typeof CaptureStatus)[keyof typeof CaptureStatus] | (string & {});
export declare const captureStatusSchema: EnumSchema<CaptureStatus>;
