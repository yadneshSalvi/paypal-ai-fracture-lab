import type { EnumSchema } from "../core/validation/schema.js";
export declare const MobileReturnFlow: {
    readonly Auto: "AUTO";
    readonly Manual: "MANUAL";
};
export type MobileReturnFlow = (typeof MobileReturnFlow)[keyof typeof MobileReturnFlow] | (string & {});
export declare const mobileReturnFlowSchema: EnumSchema<MobileReturnFlow>;
