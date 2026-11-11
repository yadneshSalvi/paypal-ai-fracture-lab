import type { Schema } from "../core/validation/schema.js";
import { DisbursementMode } from "./disbursement-mode.js";
import { type PlatformFee } from "./platform-fee.js";
export type PaymentInstruction = {
    platformFees?: PlatformFee[];
    disbursementMode?: DisbursementMode;
    payeePricingTierId?: string;
    payeeReceivableFxRateId?: string;
};
export declare const paymentInstructionSchema: Schema<PaymentInstruction>;
