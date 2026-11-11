import { type LoggingOptions, type ResolvedLoggingOptions } from "./logging.js";
import { type RetryOptions, type ResolvedRetryOptions } from "./retry.js";
export type FetchLike = typeof fetch;
export type CoreClientOptions = {
    readonly retry?: RetryOptions | undefined;
    readonly logging?: LoggingOptions | undefined;
    readonly fetch?: FetchLike | undefined;
};
export type ResolvedCoreClientOptions = {
    readonly retry: ResolvedRetryOptions;
    readonly logging: ResolvedLoggingOptions;
    readonly fetch: FetchLike;
};
export declare function buildCoreClientOptions(options: CoreClientOptions, loggingEnvironmentVariable: string): ResolvedCoreClientOptions;
