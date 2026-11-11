import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type SubscriptionTransactionDetails } from "./subscription-transaction-details.js";
export type TransactionsList = {
    transactions?: SubscriptionTransactionDetails[];
    totalItems?: number;
    totalPages?: number;
    links?: LinkDescription[];
};
export declare const transactionsListSchema: Schema<TransactionsList>;
