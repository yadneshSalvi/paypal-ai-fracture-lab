import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type ErrorDecoders, type ErrorPayload } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import { type BalancesResponse } from "../models/balances-response.js";
import { type DefaultError } from "../models/default-error.js";
import { type SearchError } from "../models/search-error.js";
import { type SearchResponse } from "../models/search-response.js";
import type { Servers } from "../servers.js";
export declare class TransactionSearch {
    #private;
    constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes);
    searchBalances(request: TransactionSearch.SearchBalancesRequest, options?: RequestOptions): ApiPromise<BalancesResponse, TransactionSearch.SearchBalancesError>;
    searchTransactions(request: TransactionSearch.SearchTransactionsRequest, options?: RequestOptions): ApiPromise<SearchResponse, TransactionSearch.SearchTransactionsError>;
}
export declare namespace TransactionSearch {
    type SearchBalancesRequest = {
        asOfTime?: string;
        currencyCode?: string;
    };
    class SearchBalancesError extends ApiError {
        readonly payload: ErrorPayload<Declared<"defaultError", DefaultError> | Declared<"defaultError2", DefaultError> | Declared<"defaultError3", DefaultError> | Declared<"defaultError4", DefaultError>>;
        static readonly errors: ErrorDecoders<SearchBalancesError>;
    }
    type SearchTransactionsRequest = {
        startDate: string;
        endDate: string;
        transactionId?: string;
        transactionType?: string;
        transactionStatus?: string;
        transactionAmount?: string;
        transactionCurrency?: string;
        paymentInstrumentType?: string;
        storeId?: string;
        terminalId?: string;
        fields?: string;
        balanceAffectingRecordsOnly?: string;
        pageSize?: number;
        page?: number;
    };
    class SearchTransactionsError extends ApiError {
        readonly payload: ErrorPayload<Declared<"searchError", SearchError>>;
        static readonly errors: ErrorDecoders<SearchTransactionsError>;
    }
}
