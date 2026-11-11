import type { ApiRequest, RawClientOptions } from "./api-request.js";
import type { ParamPair } from "./param-value.js";
import type { BodyContent } from "./request-body.js";
type HeaderDefaults = Pick<RawClientOptions, "defaultHeaders">;
type HeadersRequest = Pick<ApiRequest, "method" | "headers">;
type ContentHeaders = Pick<BodyContent, "contentType" | "contentDisposition">;
export declare class HeadersBuilder {
    #private;
    constructor(defaults: HeaderDefaults);
    build({ method, headers }: HeadersRequest, uri: string, body: ContentHeaders): RequestHeaders;
}
export declare class RequestHeaders {
    #private;
    constructor(headers: Headers);
    withCredential(headers: readonly ParamPair[], cookies: readonly ParamPair[]): Headers;
}
export {};
