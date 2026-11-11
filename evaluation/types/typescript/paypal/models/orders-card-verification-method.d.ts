import type { EnumSchema } from "../core/validation/schema.js";
export declare const OrdersCardVerificationMethod: {
    readonly ScaAlways: "SCA_ALWAYS";
    readonly ScaWhenRequired: "SCA_WHEN_REQUIRED";
    readonly _3DSecure: "3D_SECURE";
    readonly AvsCvv: "AVS_CVV";
};
export type OrdersCardVerificationMethod = (typeof OrdersCardVerificationMethod)[keyof typeof OrdersCardVerificationMethod] | (string & {});
export declare const ordersCardVerificationMethodSchema: EnumSchema<OrdersCardVerificationMethod>;
