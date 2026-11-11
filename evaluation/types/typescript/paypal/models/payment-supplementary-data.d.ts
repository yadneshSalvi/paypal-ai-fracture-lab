import type { Schema } from "../core/validation/schema.js";
import { type RelatedIdentifiers } from "./related-identifiers.js";
export type PaymentSupplementaryData = {
    relatedIds?: RelatedIdentifiers;
};
export declare const paymentSupplementaryDataSchema: Schema<PaymentSupplementaryData>;
