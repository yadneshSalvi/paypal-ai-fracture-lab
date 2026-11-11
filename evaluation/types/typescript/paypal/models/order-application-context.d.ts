import type { Schema } from "../core/validation/schema.js";
import { OrderApplicationContextLandingPage } from "./order-application-context-landing-page.js";
import { OrderApplicationContextShippingPreference } from "./order-application-context-shipping-preference.js";
import { OrderApplicationContextUserAction } from "./order-application-context-user-action.js";
import { type PaymentMethodPreference } from "./payment-method-preference.js";
import { type StoredPaymentSource } from "./stored-payment-source.js";
export type OrderApplicationContext = {
    brandName?: string;
    locale?: string;
    landingPage?: OrderApplicationContextLandingPage;
    shippingPreference?: OrderApplicationContextShippingPreference;
    userAction?: OrderApplicationContextUserAction;
    paymentMethod?: PaymentMethodPreference;
    returnUrl?: string;
    cancelUrl?: string;
    storedPaymentSource?: StoredPaymentSource;
};
export declare const orderApplicationContextSchema: Schema<OrderApplicationContext>;
