import type { Schema } from "../core/validation/schema.js";
import { type CardBrand } from "./card-brand.js";
export type NetworkTransactionReferenceEntity = {
    id: string;
    date?: string;
    network?: CardBrand;
    time?: string;
};
export declare const networkTransactionReferenceEntitySchema: Schema<NetworkTransactionReferenceEntity>;
