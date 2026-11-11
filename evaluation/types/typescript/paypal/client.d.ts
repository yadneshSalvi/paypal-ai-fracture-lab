import type { ClientOptions } from "./client-options.js";
import { Orders } from "./resources/orders.js";
import { Payments } from "./resources/payments.js";
import { Subscriptions } from "./resources/subscriptions.js";
import { TransactionSearch } from "./resources/transaction-search.js";
import { Vault } from "./resources/vault.js";
export declare class PaypalClient {
    #private;
    constructor(options?: ClientOptions);
    get orders(): Orders;
    get payments(): Payments;
    get vault(): Vault;
    get transactionSearch(): TransactionSearch;
    get subscriptions(): Subscriptions;
}
