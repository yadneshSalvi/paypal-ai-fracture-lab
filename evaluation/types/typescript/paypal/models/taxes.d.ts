import type { Schema } from "../core/validation/schema.js";
export type Taxes = {
    percentage: string;
    inclusive?: boolean;
};
export declare const taxesSchema: Schema<Taxes>;
