import type { EnumSchema } from "../core/validation/schema.js";
export declare const RefundIncompleteReason: {
    readonly Echeck: "ECHECK";
};
export type RefundIncompleteReason = (typeof RefundIncompleteReason)[keyof typeof RefundIncompleteReason] | (string & {});
export declare const refundIncompleteReasonSchema: EnumSchema<RefundIncompleteReason>;
