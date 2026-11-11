import type { Schema } from "../core/validation/schema.js";
import { type ExchangeRate } from "./exchange-rate.js";
import { type Money } from "./money.js";
import { type PlatformFee } from "./platform-fee.js";
export type SellerReceivableBreakdown = {
    grossAmount: Money;
    paypalFee?: Money;
    paypalFeeInReceivableCurrency?: Money;
    netAmount?: Money;
    receivableAmount?: Money;
    exchangeRate?: ExchangeRate;
    platformFees?: PlatformFee[];
};
export declare const sellerReceivableBreakdownSchema: Schema<SellerReceivableBreakdown>;
