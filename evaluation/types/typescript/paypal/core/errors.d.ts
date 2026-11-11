import type { HttpMethod } from "./api-request.js";
import type { ApiError } from "./api-error.js";
export type ErrorKind = "api" | "decode" | "encode" | "connection" | "timeout" | "auth";
export type CoreErrorInit = ErrorOptions & {
    readonly method: HttpMethod;
    readonly uri: string;
};
export declare abstract class CoreErrorBase extends Error {
    abstract readonly kind: ErrorKind;
    readonly method: HttpMethod;
    readonly uri: string;
    protected constructor(message: string, init: CoreErrorInit);
}
export type ResponseErrorInit = CoreErrorInit & {
    readonly status: number;
    readonly headers: Headers;
};
export declare abstract class ResponseErrorBase extends CoreErrorBase {
    abstract readonly kind: "api" | "decode";
    readonly status: number;
    readonly headers: Headers;
    protected constructor(message: string, init: ResponseErrorInit);
}
export declare class DecodeError extends ResponseErrorBase {
    readonly kind: "decode";
    constructor(message: string, init: ResponseErrorInit);
}
export declare class EncodeError extends CoreErrorBase {
    readonly kind: "encode";
    constructor(message: string, init: CoreErrorInit);
}
export declare class ConnectionError extends CoreErrorBase {
    readonly kind: "connection";
    constructor(message: string, init: CoreErrorInit);
}
export type TimeoutErrorInit = CoreErrorInit & {
    readonly timeout: number;
};
export declare class TimeoutError extends CoreErrorBase {
    readonly kind: "timeout";
    readonly timeout: number;
    constructor(message: string, init: TimeoutErrorInit);
}
export declare class AuthError extends CoreErrorBase {
    readonly kind: "auth";
    constructor(message: string, init: CoreErrorInit);
}
export type ResponseError = ApiError | DecodeError;
export declare const ResponseError: abstract new (...args: never) => ResponseError;
export type CoreError = ApiError | DecodeError | EncodeError | ConnectionError | TimeoutError | AuthError;
export declare const CoreError: abstract new (...args: never) => CoreError;
export declare class ConfigurationError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
