import type { Schema } from "../core/validation/schema.js";
import { PayeePaymentMethodPreference } from "./payee-payment-method-preference.js";
import { StandardEntryClassCode } from "./standard-entry-class-code.js";
export type PaymentMethodPreference = {
    payeePreferred?: PayeePaymentMethodPreference;
    standardEntryClassCode?: StandardEntryClassCode;
};
export declare const paymentMethodPreferenceSchema: Schema<PaymentMethodPreference>;
