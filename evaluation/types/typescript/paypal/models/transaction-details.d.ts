import type { Schema } from "../core/validation/schema.js";
import { type AuctionInformation } from "./auction-information.js";
import { type CartInformation } from "./cart-information.js";
import { type IncentiveInformation } from "./incentive-information.js";
import { type PayerInformation } from "./payer-information.js";
import { type ShippingInformation } from "./shipping-information.js";
import { type StoreInformation } from "./store-information.js";
import { type TransactionInformation } from "./transaction-information.js";
export type TransactionDetails = {
    transactionInfo?: TransactionInformation;
    payerInfo?: PayerInformation;
    shippingInfo?: ShippingInformation;
    cartInfo?: CartInformation;
    storeInfo?: StoreInformation;
    auctionInfo?: AuctionInformation;
    incentiveInfo?: IncentiveInformation;
};
export declare const transactionDetailsSchema: Schema<TransactionDetails>;
