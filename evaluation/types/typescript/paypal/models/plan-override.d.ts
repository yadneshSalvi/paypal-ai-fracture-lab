import type { Schema } from "../core/validation/schema.js";
import { type BillingCycleOverride } from "./billing-cycle-override.js";
import { type PaymentPreferencesOverride } from "./payment-preferences-override.js";
import { type TaxesOverride } from "./taxes-override.js";
export type PlanOverride = {
    billingCycles?: BillingCycleOverride[];
    paymentPreferences?: PaymentPreferencesOverride;
    taxes?: TaxesOverride;
};
export declare const planOverrideSchema: Schema<PlanOverride>;
