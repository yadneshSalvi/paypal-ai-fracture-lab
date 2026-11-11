import type { Schema } from "../core/validation/schema.js";
import { type RefundStatusDetails } from "./refund-status-details.js";
import { type RefundStatus } from "./refund-status.js";
export type RefundStatusWithDetails = {
    status?: RefundStatus;
    statusDetails?: RefundStatusDetails;
};
export declare const refundStatusWithDetailsSchema: Schema<RefundStatusWithDetails>;
