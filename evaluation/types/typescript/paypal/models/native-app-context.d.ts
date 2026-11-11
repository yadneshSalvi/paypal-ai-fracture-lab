import type { Schema } from "../core/validation/schema.js";
import { type OsType } from "./os-type.js";
export type NativeAppContext = {
    osType?: OsType;
    osVersion?: string;
};
export declare const nativeAppContextSchema: Schema<NativeAppContext>;
