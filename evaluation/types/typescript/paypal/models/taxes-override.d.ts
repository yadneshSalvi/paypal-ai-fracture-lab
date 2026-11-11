import type { Schema } from "../core/validation/schema.js";
export type TaxesOverride = {
    percentage?: string;
    inclusive?: boolean;
};
export declare const taxesOverrideSchema: Schema<TaxesOverride>;
