import type { Schema } from "../core/validation/schema.js";
import { type ErrorDetails } from "./error-details.js";
import { type LinkDescription } from "./link-description.js";
export type ErrorError = {
    name: string;
    message: string;
    debugId: string;
    details?: ErrorDetails[];
    links?: LinkDescription[];
};
export declare const errorErrorSchema: Schema<ErrorError>;
