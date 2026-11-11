import type { Schema } from "../core/validation/schema.js";
export type ApplePayPaymentData = {
    cryptogram?: string;
    eciIndicator?: string;
    emvData?: string;
    pin?: string;
};
export declare const applePayPaymentDataSchema: Schema<ApplePayPaymentData>;
