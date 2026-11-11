import type { Schema } from "../core/validation/schema.js";
import { type NetworkTransaction } from "./network-transaction.js";
import { type PaymentInitiator } from "./payment-initiator.js";
import { type StoredPaymentSourcePaymentType } from "./stored-payment-source-payment-type.js";
import { StoredPaymentSourceUsageType } from "./stored-payment-source-usage-type.js";
export type StoredPaymentSource = {
    paymentInitiator: PaymentInitiator;
    paymentType: StoredPaymentSourcePaymentType;
    usage?: StoredPaymentSourceUsageType;
    previousNetworkTransactionReference?: NetworkTransaction;
};
export declare const storedPaymentSourceSchema: Schema<StoredPaymentSource>;
