import type { Schema } from "../core/validation/schema.js";
import { type TaxIdType } from "./tax-id-type.js";
export type TaxInfo = {
    taxId: string;
    taxIdType: TaxIdType;
};
export declare const taxInfoSchema: Schema<TaxInfo>;
