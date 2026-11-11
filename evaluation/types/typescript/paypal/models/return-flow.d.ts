import type { EnumSchema } from "../core/validation/schema.js";
export declare const ReturnFlow: {
    readonly Auto: "AUTO";
    readonly Manual: "MANUAL";
};
export type ReturnFlow = (typeof ReturnFlow)[keyof typeof ReturnFlow] | (string & {});
export declare const returnFlowSchema: EnumSchema<ReturnFlow>;
