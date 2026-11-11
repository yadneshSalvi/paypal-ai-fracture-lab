import type { EnumSchema } from "../core/validation/schema.js";
export declare const CaptureType: {
    readonly OutstandingBalance: "OUTSTANDING_BALANCE";
};
export type CaptureType = (typeof CaptureType)[keyof typeof CaptureType] | (string & {});
export declare const captureTypeSchema: EnumSchema<CaptureType>;
