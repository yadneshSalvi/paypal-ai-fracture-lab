import type { HttpMethod } from "./api-request.js";
import { type RequestLoggingOptions, type ResolvedLoggingOptions } from "./logging.js";
import type { RetryAttempt } from "./retry.js";
export declare class HttpLogger {
    #private;
    constructor(requestLoggingOptions: RequestLoggingOptions | undefined, loggingOptions: ResolvedLoggingOptions, method: HttpMethod, url: URL);
    logRequest(request: Request): Promise<void>;
    logResponse(response: Response): void;
    logRetry(retry: RetryAttempt, maxRetries: number): void;
    logFailure(error: Error, startedAt: number): void;
}
