import type { Schema } from "../core/validation/schema.js";
import { type CaptureType } from "./capture-type.js";
import { type Money } from "./money.js";
export type CaptureSubscriptionRequest = {
    note: string;
    captureType: CaptureType;
    amount: Money;
};
export declare const captureSubscriptionRequestSchema: Schema<CaptureSubscriptionRequest>;
