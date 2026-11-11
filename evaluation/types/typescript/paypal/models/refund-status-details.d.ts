import type { Schema } from "../core/validation/schema.js";
import { type RefundIncompleteReason } from "./refund-incomplete-reason.js";
export type RefundStatusDetails = {
    reason?: RefundIncompleteReason;
};
export declare const refundStatusDetailsSchema: Schema<RefundStatusDetails>;
