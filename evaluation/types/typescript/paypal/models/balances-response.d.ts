import type { Schema } from "../core/validation/schema.js";
import { type BalanceInformation } from "./balance-information.js";
export type BalancesResponse = {
    balances?: BalanceInformation[];
    accountId?: string;
    asOfTime?: string;
    lastRefreshTime?: string;
};
export declare const balancesResponseSchema: Schema<BalancesResponse>;
