import type { Schema } from "../core/validation/schema.js";
import { type LinkHttpMethod } from "./link-http-method.js";
export type LinkDescription = {
    href: string;
    rel: string;
    method?: LinkHttpMethod;
};
export declare const linkDescriptionSchema: Schema<LinkDescription>;
