import type { Schema } from "../core/validation/schema.js";
import { type LinkDescription } from "./link-description.js";
export type ErrorDetails = {
    field?: string;
    value?: string;
    location?: string;
    issue: string;
    links?: LinkDescription[];
    description?: string;
};
export declare const errorDetailsSchema: Schema<ErrorDetails>;
