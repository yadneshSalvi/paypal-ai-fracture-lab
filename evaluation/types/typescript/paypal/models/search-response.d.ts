import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type TransactionDetails } from "./transaction-details.js";
export type SearchResponse = {
    transactionDetails?: TransactionDetails[];
    accountNumber?: string;
    startDate?: string;
    endDate?: string;
    lastRefreshedDatetime?: string;
    page?: number;
    totalItems?: number;
    totalPages?: number;
    links?: LinkDescription[];
};
export declare const searchResponseSchema: Schema<SearchResponse>;
