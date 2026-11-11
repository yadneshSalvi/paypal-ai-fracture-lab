import type { EnumSchema } from "../core/validation/schema.js";
export declare const CheckoutPaymentIntent: {
    readonly Capture: "CAPTURE";
    readonly Authorize: "AUTHORIZE";
};
export type CheckoutPaymentIntent = (typeof CheckoutPaymentIntent)[keyof typeof CheckoutPaymentIntent] | (string & {});
export declare const checkoutPaymentIntentSchema: EnumSchema<CheckoutPaymentIntent>;
