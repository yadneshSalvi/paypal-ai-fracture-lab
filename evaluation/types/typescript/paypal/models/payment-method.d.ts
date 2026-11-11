import type { Schema } from "../core/validation/schema.js";
import { PayeePaymentMethodPreference } from "./payee-payment-method-preference.js";
export type PaymentMethod = {
    payeePreferred?: PayeePaymentMethodPreference;
};
export declare const paymentMethodSchema: Schema<PaymentMethod>;
