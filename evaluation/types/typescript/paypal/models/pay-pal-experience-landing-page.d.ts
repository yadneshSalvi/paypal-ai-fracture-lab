import type { EnumSchema } from "../core/validation/schema.js";
export declare const PayPalExperienceLandingPage: {
    readonly Login: "LOGIN";
    readonly GuestCheckout: "GUEST_CHECKOUT";
    readonly NoPreference: "NO_PREFERENCE";
    readonly Billing: "BILLING";
};
export type PayPalExperienceLandingPage = (typeof PayPalExperienceLandingPage)[keyof typeof PayPalExperienceLandingPage] | (string & {});
export declare const payPalExperienceLandingPageSchema: EnumSchema<PayPalExperienceLandingPage>;
