import type { EnumSchema } from "../core/validation/schema.js";
export declare const RefundStatus: {
    readonly Cancelled: "CANCELLED";
    readonly Failed: "FAILED";
    readonly Pending: "PENDING";
    readonly Completed: "COMPLETED";
};
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus] | (string & {});
export declare const refundStatusSchema: EnumSchema<RefundStatus>;
