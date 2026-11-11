import type { Schema } from "../core/validation/schema.js";
import { type CardResponseWithBillingAddress } from "./card-response-with-billing-address.js";
export type SubscriptionPaymentSourceResponse = {
    card?: CardResponseWithBillingAddress;
};
export declare const subscriptionPaymentSourceResponseSchema: Schema<SubscriptionPaymentSourceResponse>;
