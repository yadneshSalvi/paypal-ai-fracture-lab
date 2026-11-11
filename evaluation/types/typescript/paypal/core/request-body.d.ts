import type { HttpMethod } from "./api-request.js";
import { type FileInput } from "./binary.js";
import type { Param, StyledParam } from "./param-value.js";
import type { Entry } from "./validation/schema.js";
export type Json = string | number | boolean | null | readonly Json[] | JsonObject;
export type JsonObject = {
    readonly [key: string]: Json | undefined;
};
export type ContentType = "application/x-www-form-urlencoded;charset=UTF-8" | "application/json" | "text/plain;charset=utf-8" | "application/octet-stream" | `multipart/form-data; boundary=${string}` | (string & {});
export type BodyContent = {
    body: string | FormData | Blob | Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array> | null;
    contentType?: ContentType;
    contentDisposition?: string;
    streaming?: true;
};
export type EmptyBody = {
    readonly kind: "empty";
};
export type JsonBody = {
    readonly kind: "json";
    readonly value: unknown;
    readonly schema: Entry<unknown>;
};
export type FormUrlEncodedBody = {
    readonly kind: "formUrlEncoded";
    readonly value: readonly StyledParam[];
};
export type TextBody = {
    readonly kind: "text";
    readonly value: unknown;
    readonly schema: Entry<unknown>;
};
export type MultipartTextPart = StyledParam & {
    readonly kind: "text";
};
export type MultipartJsonPart = Param & {
    readonly kind: "json";
    readonly contentType: "application/json" | `application/${string}+json`;
};
export type MultipartFilePart = {
    readonly kind: "file";
    readonly name: string;
    readonly value: FileInput | readonly (FileInput | null | undefined)[] | null | undefined;
    readonly contentType?: string | undefined;
};
export type MultipartPart = MultipartTextPart | MultipartJsonPart | MultipartFilePart;
export type MultipartBody = {
    readonly kind: "multipart";
    readonly value: readonly MultipartPart[];
};
export type BinaryBody = {
    readonly kind: "binary";
    readonly value: FileInput | null | undefined;
    readonly contentType: string;
};
export type RequestBody = EmptyBody | JsonBody | FormUrlEncodedBody | TextBody | MultipartBody | BinaryBody;
export declare function buildBody(method: HttpMethod, uri: string, body: RequestBody, signal?: AbortSignal): BodyContent;
