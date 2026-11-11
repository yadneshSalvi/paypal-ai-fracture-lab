import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { SetupFeeFailureAction } from "./setup-fee-failure-action.js";
export type PaymentPreferences = {
    autoBillOutstanding?: boolean;
    setupFee?: Money;
    setupFeeFailureAction?: SetupFeeFailureAction;
    paymentFailureThreshold?: number;
};
export declare const paymentPreferencesSchema: Schema<PaymentPreferences>;
