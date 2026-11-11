import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
import { type TransactionSearchErrorDetails } from "./transaction-search-error-details.js";
export type SearchError = {
    name: string;
    message: string;
    debugId: string;
    informationLink?: string;
    details?: TransactionSearchErrorDetails[];
    links?: LinkDescription[];
    totalItems?: number;
    maximumItems?: number;
};
export declare const searchErrorSchema: Schema<SearchError>;
