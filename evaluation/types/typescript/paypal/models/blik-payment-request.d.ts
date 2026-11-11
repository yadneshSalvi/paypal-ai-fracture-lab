import type { Schema } from "../core/validation/schema.js";
import { type BlikExperienceContext } from "./blik-experience-context.js";
import { type BlikLevel0PaymentObject } from "./blik-level0-payment-object.js";
import { type BlikOneClickPaymentRequest } from "./blik-one-click-payment-request.js";
export type BlikPaymentRequest = {
    name: string;
    countryCode: string;
    email?: string;
    experienceContext?: BlikExperienceContext;
    level0?: BlikLevel0PaymentObject;
    oneClick?: BlikOneClickPaymentRequest;
};
export declare const blikPaymentRequestSchema: Schema<BlikPaymentRequest>;
