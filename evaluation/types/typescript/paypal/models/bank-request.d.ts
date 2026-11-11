import type { Schema } from "../core/validation/schema.js";
import { type SepaDebitRequest } from "./sepa-debit-request.js";
export type BankRequest = {
    achDebit?: Record<string, unknown>;
    sepaDebit?: SepaDebitRequest;
};
export declare const bankRequestSchema: Schema<BankRequest>;
