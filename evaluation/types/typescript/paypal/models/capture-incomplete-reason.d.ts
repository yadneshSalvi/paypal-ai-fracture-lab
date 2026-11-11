import type { EnumSchema } from "../core/validation/schema.js";
export declare const CaptureIncompleteReason: {
    readonly BuyerComplaint: "BUYER_COMPLAINT";
    readonly Chargeback: "CHARGEBACK";
    readonly Echeck: "ECHECK";
    readonly InternationalWithdrawal: "INTERNATIONAL_WITHDRAWAL";
    readonly Other: "OTHER";
    readonly PendingReview: "PENDING_REVIEW";
    readonly ReceivingPreferenceMandatesManualAction: "RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION";
    readonly Refunded: "REFUNDED";
    readonly TransactionApprovedAwaitingFunding: "TRANSACTION_APPROVED_AWAITING_FUNDING";
    readonly Unilateral: "UNILATERAL";
    readonly VerificationRequired: "VERIFICATION_REQUIRED";
    readonly DeclinedByRiskFraudFilters: "DECLINED_BY_RISK_FRAUD_FILTERS";
};
export type CaptureIncompleteReason = (typeof CaptureIncompleteReason)[keyof typeof CaptureIncompleteReason] | (string & {});
export declare const captureIncompleteReasonSchema: EnumSchema<CaptureIncompleteReason>;
