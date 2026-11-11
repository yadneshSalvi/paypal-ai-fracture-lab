import type { Schema } from "../core/validation/schema.js";
import { type StoredPaymentSource } from "./stored-payment-source.js";
export type OrderConfirmApplicationContext = {
    brandName?: string;
    locale?: string;
    returnUrl?: string;
    cancelUrl?: string;
    storedPaymentSource?: StoredPaymentSource;
};
export declare const orderConfirmApplicationContextSchema: Schema<OrderConfirmApplicationContext>;
