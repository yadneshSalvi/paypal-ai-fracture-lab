import type { EnumSchema } from "../core/validation/schema.js";
export declare const ApplePayPaymentDataType: {
    readonly _3Dsecure: "3DSECURE";
    readonly Emv: "EMV";
};
export type ApplePayPaymentDataType = (typeof ApplePayPaymentDataType)[keyof typeof ApplePayPaymentDataType] | (string & {});
export declare const applePayPaymentDataTypeSchema: EnumSchema<ApplePayPaymentDataType>;
