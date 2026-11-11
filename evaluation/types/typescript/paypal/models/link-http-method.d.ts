import type { EnumSchema } from "../core/validation/schema.js";
export declare const LinkHttpMethod: {
    readonly Get: "GET";
    readonly Post: "POST";
    readonly Put: "PUT";
    readonly Delete: "DELETE";
    readonly Head: "HEAD";
    readonly Connect: "CONNECT";
    readonly Options: "OPTIONS";
    readonly Patch: "PATCH";
};
export type LinkHttpMethod = (typeof LinkHttpMethod)[keyof typeof LinkHttpMethod] | (string & {});
export declare const linkHttpMethodSchema: EnumSchema<LinkHttpMethod>;
