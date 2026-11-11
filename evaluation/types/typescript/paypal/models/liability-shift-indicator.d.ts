import type { EnumSchema } from "../core/validation/schema.js";
export declare const LiabilityShiftIndicator: {
    readonly No: "NO";
    readonly Possible: "POSSIBLE";
    readonly Unknown: "UNKNOWN";
};
export type LiabilityShiftIndicator = (typeof LiabilityShiftIndicator)[keyof typeof LiabilityShiftIndicator] | (string & {});
export declare const liabilityShiftIndicatorSchema: EnumSchema<LiabilityShiftIndicator>;
