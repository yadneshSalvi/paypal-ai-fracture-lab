import type { Schema } from "../core/validation/schema.js";
import { type BlikOneClickPaymentObject } from "./blik-one-click-payment-object.js";
export type BlikPaymentObject = {
    name?: string;
    countryCode?: string;
    email?: string;
    oneClick?: BlikOneClickPaymentObject;
};
export declare const blikPaymentObjectSchema: Schema<BlikPaymentObject>;
