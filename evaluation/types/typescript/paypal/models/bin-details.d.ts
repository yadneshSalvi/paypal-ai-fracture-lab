import type { Schema } from "../core/validation/schema.js";
export type BinDetails = {
    bin?: string;
    issuingBank?: string;
    binCountryCode?: string;
    products?: string[];
};
export declare const binDetailsSchema: Schema<BinDetails>;
