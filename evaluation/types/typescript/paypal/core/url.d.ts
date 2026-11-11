import type { ApiRequest, RawClientOptions, ServerBase, UrlTemplate } from "./api-request.js";
import type { StyledParam, ParamPair } from "./param-value.js";
type UrlDefaults = Pick<RawClientOptions, "defaultPathParams" | "defaultQuery">;
type UrlRequest = Pick<ApiRequest, "method" | "urlTemplate" | "pathParams" | "query">;
export declare class UrlBuilder {
    #private;
    constructor(defaults: UrlDefaults);
    build(request: UrlRequest): RequestUrl;
}
export declare class RequestUrl {
    #private;
    readonly uri: string;
    constructor(url: URL);
    withQuery(pairs: readonly ParamPair[]): URL;
}
export declare function buildQueryUrl(url: URL, queryInWireOrder: ReadonlyArray<readonly StyledParam[]>): URL;
export declare function resolveBaseUrl(server: ServerBase): string;
export declare function templateUri(template: UrlTemplate): string;
export {};
