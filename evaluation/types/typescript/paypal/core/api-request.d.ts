import type { RequestBody } from "./request-body.js";
import type { RequestRetryOptions } from "./retry.js";
import type { RequestLoggingOptions } from "./logging.js";
import type { ResolvedCoreClientOptions } from "./client-options.js";
import type { StyledParam, Param, ParamPair } from "./param-value.js";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type RequestOptions = {
    signal?: AbortSignal | undefined;
    retry?: RequestRetryOptions;
    logging?: RequestLoggingOptions;
};
export type RawClientOptions = ResolvedCoreClientOptions & {
    readonly defaultHeaders: readonly Param[];
    readonly defaultQuery: readonly StyledParam[];
    readonly defaultPathParams: readonly Param[];
};
export type UrlTemplate<Path extends string = string> = {
    readonly baseUrl: string;
    readonly subPath: Path;
};
export type ServerBase = {
    baseUrl: string;
    variables?: Record<string, string> | undefined;
};
type Placeholders<Path extends string> = Path extends `${string}{${infer Name}}${infer Rest}` ? Name | Placeholders<Rest> : never;
export type PathParamName<Path extends string> = Path extends `${string}{${string}}${string}` ? Placeholders<Path> : Path extends `/${string}` ? never : string;
export type AuthParams = {
    readonly headers: readonly ParamPair[];
    readonly query: readonly ParamPair[];
    readonly cookies: readonly ParamPair[];
};
export type AuthScheme = {
    resolve(signal: AbortSignal): Promise<AuthParams> | AuthParams;
    hasCredentials(): boolean;
    invalidate?(): void;
};
export type ApiRequest<Path extends string = string> = {
    readonly method: HttpMethod;
    readonly urlTemplate: UrlTemplate<Path>;
    readonly auth: AuthScheme;
    readonly pathParams: readonly Param<PathParamName<Path>>[];
    readonly query: readonly StyledParam[];
    readonly headers: readonly Param[];
    readonly body: RequestBody;
};
export {};
