import type { Schema } from "../core/validation/schema.js";
import { type AuthorizationWithAdditionalData } from "./authorization-with-additional-data.js";
import { type OrdersCapture } from "./orders-capture.js";
import { type Refund } from "./refund.js";
export type PaymentCollection = {
    authorizations?: AuthorizationWithAdditionalData[];
    captures?: OrdersCapture[];
    refunds?: Refund[];
};
export declare const paymentCollectionSchema: Schema<PaymentCollection>;
