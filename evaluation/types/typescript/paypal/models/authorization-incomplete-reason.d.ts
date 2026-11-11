import type { EnumSchema } from "../core/validation/schema.js";
export declare const AuthorizationIncompleteReason: {
    readonly PendingReview: "PENDING_REVIEW";
    readonly DeclinedByRiskFraudFilters: "DECLINED_BY_RISK_FRAUD_FILTERS";
};
export type AuthorizationIncompleteReason = (typeof AuthorizationIncompleteReason)[keyof typeof AuthorizationIncompleteReason] | (string & {});
export declare const authorizationIncompleteReasonSchema: EnumSchema<AuthorizationIncompleteReason>;
