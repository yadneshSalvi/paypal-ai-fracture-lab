import type { Schema } from "../core/validation/schema.js";
import { type Money } from "./money.js";
export type BalanceInformation = {
    currency: string;
    primary?: boolean;
    totalBalance: Money;
    availableBalance?: Money;
    withheldBalance?: Money;
};
export declare const balanceInformationSchema: Schema<BalanceInformation>;
