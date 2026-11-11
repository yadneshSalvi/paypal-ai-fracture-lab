import type { EnumSchema } from "../core/validation/schema.js";
export declare const GooglePayPaymentMethod: {
    readonly Card: "CARD";
};
export type GooglePayPaymentMethod = (typeof GooglePayPaymentMethod)[keyof typeof GooglePayPaymentMethod] | (string & {});
export declare const googlePayPaymentMethodSchema: EnumSchema<GooglePayPaymentMethod>;
