import type { EnumSchema } from "../core/validation/schema.js";
export declare const DisbursementMode: {
    readonly Instant: "INSTANT";
    readonly Delayed: "DELAYED";
};
export type DisbursementMode = (typeof DisbursementMode)[keyof typeof DisbursementMode] | (string & {});
export declare const disbursementModeSchema: EnumSchema<DisbursementMode>;
