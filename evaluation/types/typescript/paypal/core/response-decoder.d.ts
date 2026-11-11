import type { Entry } from "./validation/schema.js";
import type { HttpMethod } from "./api-request.js";
import type { BinaryContent, BinaryErrorContent } from "./binary.js";
export type JsonResponseDecoder<T> = {
    readonly kind: "json";
    readonly schema: Entry<T>;
};
export type TextResponseDecoder<T> = {
    readonly kind: "text";
    readonly schema: Entry<T>;
};
export type EmptyResponseDecoder = {
    readonly kind: "empty";
};
export type BinaryResponseDecoder = {
    readonly kind: "binary";
    readonly contentType: string;
};
export type BinaryErrorResponseDecoder = {
    readonly kind: "binaryError";
};
export type ResponseDecoder<T> = JsonResponseDecoder<T> | TextResponseDecoder<T> | ([
    T
] extends [
    undefined
] ? EmptyResponseDecoder : never) | ([
    T
] extends [
    BinaryContent
] ? BinaryResponseDecoder : never) | ([
    T
] extends [
    BinaryErrorContent
] ? BinaryErrorResponseDecoder : never);
export type AnyResponseDecoder = JsonResponseDecoder<unknown> | TextResponseDecoder<unknown> | EmptyResponseDecoder | BinaryResponseDecoder | BinaryErrorResponseDecoder;
export declare function decodeResponse<T>(decoder: ResponseDecoder<T>, response: Response, method: HttpMethod, uri: string): Promise<T>;
export declare function decodeResponse(decoder: AnyResponseDecoder, response: Response, method: HttpMethod, uri: string): Promise<unknown>;
