import type { Schema } from "../core/validation/schema.js";
import { type RefundPlatformFee } from "./refund-platform-fee.js";
export type RefundPaymentInstruction = {
    platformFees?: RefundPlatformFee[];
};
export declare const refundPaymentInstructionSchema: Schema<RefundPaymentInstruction>;
