import type { Schema } from "../core/validation/schema.js";
import { type CardBrand } from "./card-brand.js";
export type NetworkTransaction = {
    id?: string;
    date?: string;
    network?: CardBrand;
    acquirerReferenceNumber?: string;
};
export declare const networkTransactionSchema: Schema<NetworkTransaction>;
