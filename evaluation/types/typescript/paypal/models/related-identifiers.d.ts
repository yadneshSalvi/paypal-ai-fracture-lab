import type { Schema } from "../core/validation/schema.js";
export type RelatedIdentifiers = {
    orderId?: string;
    authorizationId?: string;
    captureId?: string;
};
export declare const relatedIdentifiersSchema: Schema<RelatedIdentifiers>;
