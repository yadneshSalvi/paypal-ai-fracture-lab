import type { ApiRequest, RequestOptions, RawClientOptions } from "./api-request.js";
import { type AnyApiError, type ResponseHandler } from "./api-error.js";
import { ApiPromise } from "./api-promise.js";
export declare class RawClient {
    #private;
    constructor(config: RawClientOptions);
    execute<T, E extends AnyApiError, Path extends string>(apiRequest: ApiRequest<Path>, responseHandler: ResponseHandler<T, E>, options?: RequestOptions): ApiPromise<T, E>;
}
