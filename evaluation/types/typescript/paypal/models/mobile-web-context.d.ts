import type { Schema } from "../core/validation/schema.js";
import { MobileReturnFlow } from "./mobile-return-flow.js";
export type MobileWebContext = {
    returnFlow?: MobileReturnFlow;
    buyerUserAgent?: string;
};
export declare const mobileWebContextSchema: Schema<MobileWebContext>;
