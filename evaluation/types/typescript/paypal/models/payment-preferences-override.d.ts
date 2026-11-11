import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type SetupFeeFailureAction } from "./setup-fee-failure-action.js";
export type PaymentPreferencesOverride = {
    autoBillOutstanding?: boolean;
    setupFee?: Money;
    setupFeeFailureAction?: SetupFeeFailureAction;
    paymentFailureThreshold?: number;
};
export declare const paymentPreferencesOverrideSchema: Schema<PaymentPreferencesOverride>;
