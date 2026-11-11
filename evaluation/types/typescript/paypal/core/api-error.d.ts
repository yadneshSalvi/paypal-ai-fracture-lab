import { type AnyResponseDecoder, type BinaryResponseDecoder, type ResponseDecoder } from "./response-decoder.js";
import { ResponseErrorBase, type ResponseErrorInit } from "./errors.js";
import type { HttpMethod } from "./api-request.js";
export type Declared<K extends string, B> = {
    readonly kind: K;
    readonly body: B;
};
export type Undeclared = {
    readonly kind: "undeclared";
    readonly rawBody: ArrayBuffer;
};
export type ErrorPayload<P = never> = P | Undeclared;
export type AnyPayload = ErrorPayload<Declared<string, unknown>>;
export type ApiErrorInit<Payload = Undeclared> = ResponseErrorInit & {
    readonly payload: Payload;
};
export declare class ApiError extends ResponseErrorBase {
    readonly kind: "api";
    readonly payload: AnyPayload;
    constructor(init: ApiErrorInit<AnyPayload>);
}
type StatusPattern = number | "1XX" | "2XX" | "3XX" | "4XX" | "5XX" | "default" | readonly [
    number,
    number
];
export type AnyApiError = ApiError;
export type PayloadOf<E extends AnyApiError> = E["payload"];
type AnyMatcher = {
    readonly on: StatusPattern;
    readonly kind: string;
    readonly decode: Exclude<AnyResponseDecoder, BinaryResponseDecoder>;
};
type ErrorMatcher<D> = D extends {
    kind: infer K extends string;
    body: infer B;
} ? {
    readonly on: StatusPattern;
    readonly kind: K;
    readonly decode: Exclude<ResponseDecoder<B>, BinaryResponseDecoder>;
} : never;
export type ErrorDecoders<E extends AnyApiError> = readonly ErrorMatcher<PayloadOf<E>>[];
export type ErrorFactory<E extends AnyApiError> = (new (init: ApiErrorInit<PayloadOf<E>>) => E) & {
    readonly errors?: ErrorDecoders<E> | undefined;
};
export type ResponseHandler<T = unknown, E extends AnyApiError = AnyApiError> = {
    success: ResponseDecoder<T>;
    errorFactory: ErrorFactory<E>;
};
export declare function decodeErrorPayload(response: Response, matchers: readonly AnyMatcher[] | undefined, status: number, method: HttpMethod, uri: string): Promise<AnyPayload>;
export {};
