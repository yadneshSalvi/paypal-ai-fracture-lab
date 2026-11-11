import type { Schema } from "../core/validation/schema.js";
import { type MerchantPreferences } from "./merchant-preferences.js";
import { type PaymentPreferences } from "./payment-preferences.js";
import { type SubscriptionBillingCycle } from "./subscription-billing-cycle.js";
import { type Taxes } from "./taxes.js";
export type PlanDetails = {
    productId?: string;
    name?: string;
    description?: string;
    billingCycles?: SubscriptionBillingCycle[];
    paymentPreferences?: PaymentPreferences;
    merchantPreferences?: MerchantPreferences;
    taxes?: Taxes;
    quantitySupported?: boolean;
};
export declare const planDetailsSchema: Schema<PlanDetails>;
