import type { Schema } from "../core/validation/schema.js";
export type BlikOneClickPaymentRequest = {
    authCode?: string;
    consumerReference: string;
    aliasLabel?: string;
    aliasKey?: string;
};
export declare const blikOneClickPaymentRequestSchema: Schema<BlikOneClickPaymentRequest>;
