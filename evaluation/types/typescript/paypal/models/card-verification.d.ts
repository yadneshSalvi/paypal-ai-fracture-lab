import type { Schema } from "../core/validation/schema.js";
import { OrdersCardVerificationMethod } from "./orders-card-verification-method.js";
export type CardVerification = {
    method?: OrdersCardVerificationMethod;
};
export declare const cardVerificationSchema: Schema<CardVerification>;
