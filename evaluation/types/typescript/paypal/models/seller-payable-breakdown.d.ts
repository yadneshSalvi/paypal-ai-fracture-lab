import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
import { type NetAmountBreakdownItem } from "./net-amount-breakdown-item.js";
import { type PlatformFee } from "./platform-fee.js";
export type SellerPayableBreakdown = {
    grossAmount?: Money;
    paypalFee?: Money;
    paypalFeeInReceivableCurrency?: Money;
    netAmount?: Money;
    netAmountInReceivableCurrency?: Money;
    platformFees?: PlatformFee[];
    netAmountBreakdown?: NetAmountBreakdownItem[];
    totalRefundedAmount?: Money;
};
export declare const sellerPayableBreakdownSchema: Schema<SellerPayableBreakdown>;
