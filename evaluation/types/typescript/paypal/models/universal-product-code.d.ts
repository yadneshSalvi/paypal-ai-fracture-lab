import type { Schema } from "../core/validation/schema.js";
import { type UpcType } from "./upc-type.js";
export type UniversalProductCode = {
    type: UpcType;
    code: string;
};
export declare const universalProductCodeSchema: Schema<UniversalProductCode>;
