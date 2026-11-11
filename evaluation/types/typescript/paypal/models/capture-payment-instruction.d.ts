import type { Schema } from "../core/validation/schema.js";
import { DisbursementMode } from "./disbursement-mode.js";
import { type PlatformFee } from "./platform-fee.js";
export type CapturePaymentInstruction = {
    platformFees?: PlatformFee[];
    disbursementMode?: DisbursementMode;
    payeeReceivableFxRateId?: string;
};
export declare const capturePaymentInstructionSchema: Schema<CapturePaymentInstruction>;
