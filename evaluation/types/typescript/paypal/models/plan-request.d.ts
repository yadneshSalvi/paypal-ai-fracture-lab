import type { Schema } from "../core/validation/schema.js";
import { type MerchantPreferences } from "./merchant-preferences.js";
import { type PaymentPreferences } from "./payment-preferences.js";
import { PlanRequestStatus } from "./plan-request-status.js";
import { type SubscriptionBillingCycle } from "./subscription-billing-cycle.js";
import { type Taxes } from "./taxes.js";
export type PlanRequest = {
    productId: string;
    name: string;
    status?: PlanRequestStatus;
    description?: string;
    billingCycles: SubscriptionBillingCycle[];
    paymentPreferences: PaymentPreferences;
    merchantPreferences?: MerchantPreferences;
    taxes?: Taxes;
    quantitySupported?: boolean;
};
export declare const planRequestSchema: Schema<PlanRequest>;
