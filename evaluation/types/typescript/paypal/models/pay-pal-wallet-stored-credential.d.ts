import type { Schema } from "../core/validation/schema.js";
import { type PaymentInitiator } from "./payment-initiator.js";
import { StoredPaymentSourceUsageType } from "./stored-payment-source-usage-type.js";
import { type UsagePattern } from "./usage-pattern.js";
export type PayPalWalletStoredCredential = {
    paymentInitiator: PaymentInitiator;
    chargePattern?: UsagePattern;
    usagePattern?: UsagePattern;
    usage?: StoredPaymentSourceUsageType;
};
export declare const payPalWalletStoredCredentialSchema: Schema<PayPalWalletStoredCredential>;
