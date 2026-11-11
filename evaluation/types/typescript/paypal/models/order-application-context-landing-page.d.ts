import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrderApplicationContextLandingPage: {
    readonly Login: "LOGIN";
    readonly Billing: "BILLING";
    readonly NoPreference: "NO_PREFERENCE";
};
export type OrderApplicationContextLandingPage = (typeof OrderApplicationContextLandingPage)[keyof typeof OrderApplicationContextLandingPage] | (string & {});
export declare const orderApplicationContextLandingPageSchema: EnumSchema<OrderApplicationContextLandingPage>;
