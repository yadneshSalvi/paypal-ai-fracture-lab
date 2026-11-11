import type { HttpMethod } from "./api-request.js";
import { type ConnectionError, type TimeoutError } from "./errors.js";
import type { HttpLogger } from "./http-logger.js";
export type RetryOptions = {
    readonly timeout?: number;
    readonly statusCodesToRetry?: readonly number[];
    readonly httpMethodsToRetry?: readonly HttpMethod[];
    readonly maxRetries?: number;
    readonly delay?: number;
    readonly backoffFactor?: number;
    readonly useExponentialBackoff?: boolean;
    readonly maxJitter?: number;
    readonly onRetry?: (attempt: RetryAttempt) => void;
};
export type RequestRetryOptions = Pick<RetryOptions, "maxRetries" | "timeout" | "statusCodesToRetry">;
export type ResolvedRetryOptions = Required<Omit<RetryOptions, "onRetry">> & {
    readonly onRetry?: RetryOptions["onRetry"];
};
export declare function buildRetryOptions(retry: RetryOptions | undefined, fallbacks?: ResolvedRetryOptions): ResolvedRetryOptions;
export type RetryAttempt = {
    readonly attemptNumber: number;
    readonly delay: number;
    readonly reason: RetryReason;
};
export type RetryReason = {
    readonly kind: "status";
    readonly status: number;
    readonly headers: Headers;
} | {
    readonly kind: "fault";
    readonly error: ConnectionError | TimeoutError;
};
export type RespondedAttempt = {
    readonly kind: "response";
    readonly response: Response;
    readonly isStreaming: boolean;
    discard(): void;
};
export type FaultedAttempt = {
    readonly kind: "fault";
    readonly error: ConnectionError | TimeoutError;
    readonly isStreaming: boolean;
};
export declare class RetryPolicy {
    #private;
    constructor(retry: RetryOptions | undefined, fallbacks: ResolvedRetryOptions);
    execute(method: HttpMethod, callerSignal: AbortSignal, startedAt: number, logger: HttpLogger, send: (timeout: number) => Promise<RespondedAttempt | FaultedAttempt>): Promise<Response>;
}
