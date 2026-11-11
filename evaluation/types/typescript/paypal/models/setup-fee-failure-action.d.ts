import type { EnumSchema } from "../core/validation/schema.js";
export declare const SetupFeeFailureAction: {
    readonly Continue: "CONTINUE";
    readonly Cancel: "CANCEL";
};
export type SetupFeeFailureAction = (typeof SetupFeeFailureAction)[keyof typeof SetupFeeFailureAction] | (string & {});
export declare const setupFeeFailureActionSchema: EnumSchema<SetupFeeFailureAction>;
