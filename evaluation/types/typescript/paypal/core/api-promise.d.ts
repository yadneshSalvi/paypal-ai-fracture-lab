import type { AnyApiError, PayloadOf } from "./api-error.js";
import type { HttpMethod } from "./api-request.js";
export type RequestOutcome<T, E extends AnyApiError> = {
    ok: true;
    status: number;
    headers: Headers;
    data: T;
} | {
    ok: false;
    status: number;
    headers: Headers;
    error: E;
};
export type ApiResult<T, E extends AnyApiError> = {
    ok: true;
    status: number;
    headers: Headers;
    value: T;
} | {
    ok: false;
    status: number;
    headers: Headers;
    message: string;
    method: HttpMethod;
    uri: string;
    payload: PayloadOf<E>;
};
export declare class ApiPromise<T, E extends AnyApiError> extends Promise<T> {
    #private;
    constructor(outcome: Promise<RequestOutcome<T, E>>);
    static get [Symbol.species](): PromiseConstructor;
    asApiResult(): Promise<ApiResult<T, E>>;
}
